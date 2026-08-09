import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren
} from "react";
import type { PracticeAttempt, PracticeMode, TopicMastery } from "@interview-architect/domain";
import { api, isTransportError, type ProgressPayload } from "../lib/api";
import { clearInterviewArchitectStorage, LEARNER_SNAPSHOT_KEY } from "../lib/study-storage";

export type SyncStatus = "checking" | "online" | "offline" | "error";

export interface LearnerSnapshot {
  attempts: PracticeAttempt[];
  bookmarks: string[];
  mastery: TopicMastery[];
}

export interface EraseStudyDataResult {
  /** Whether a fresh anonymous session could be prepared after the erasure. */
  sessionReady: boolean;
}

export interface CompletionInput {
  durationSeconds: number;
  selfScore: number;
  rubricScores: Record<string, number>;
}

export interface CompletionAttemptResult {
  attempt: PracticeAttempt;
  /** A transport error retained the local review; retry with the same key. */
  pendingSync: boolean;
}

interface LearnerContextValue extends LearnerSnapshot {
  syncStatus: SyncStatus;
  syncMessage?: string;
  startAttempt: (
    questionId: string,
    questionVersion: number,
    mode?: PracticeMode
  ) => Promise<PracticeAttempt>;
  completeAttempt: (
    attempt: PracticeAttempt,
    input: CompletionInput,
    idempotencyKey?: string
  ) => Promise<CompletionAttemptResult>;
  abandonAttempt: (attempt: PracticeAttempt, durationSeconds: number) => Promise<void>;
  toggleBookmark: (questionId: string) => Promise<void>;
  refreshProgress: () => Promise<void>;
  eraseStudyData: () => Promise<EraseStudyDataResult>;
}

function emptySnapshot(): LearnerSnapshot {
  return { attempts: [], bookmarks: [], mastery: [] };
}

const initialSnapshot = emptySnapshot();
const LearnerContext = createContext<LearnerContextValue | undefined>(undefined);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeAttempt(value: unknown): PracticeAttempt | undefined {
  if (!isRecord(value)
    || typeof value.id !== "string"
    || typeof value.userId !== "string"
    || typeof value.questionId !== "string"
    || !Number.isInteger(value.questionVersion)
    || (value.status !== "in_progress" && value.status !== "completed" && value.status !== "abandoned")
    || typeof value.startedAt !== "string") {
    return undefined;
  }

  // Snapshots written before Design Studio did not contain a mode. They remain
  // compatible with the API's default and resume as Learn sessions.
  return {
    ...(value as unknown as PracticeAttempt),
    mode: value.mode === "mock" ? "mock" : "learn"
  };
}

function readSnapshot(): LearnerSnapshot {
  try {
    const raw = window.localStorage.getItem(LEARNER_SNAPSHOT_KEY);
    if (!raw) return initialSnapshot;
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return initialSnapshot;

    return {
      attempts: Array.isArray(parsed.attempts)
        ? parsed.attempts.map(normalizeAttempt).filter((attempt): attempt is PracticeAttempt => Boolean(attempt))
        : [],
      bookmarks: Array.isArray(parsed.bookmarks)
        ? parsed.bookmarks.filter((bookmark): bookmark is string => typeof bookmark === "string")
        : [],
      mastery: Array.isArray(parsed.mastery) ? (parsed.mastery as TopicMastery[]) : []
    };
  } catch {
    return initialSnapshot;
  }
}

function writeSnapshot(snapshot: LearnerSnapshot): void {
  try {
    window.localStorage.setItem(LEARNER_SNAPSHOT_KEY, JSON.stringify(snapshot));
  } catch {
    // Privacy-mode browsers can reject localStorage. The live session still works.
  }
}

function idForLocalAttempt(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `local-${crypto.randomUUID()}`;
  }
  return `local-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function newCompletionOperationKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  const suffix = `${Date.now().toString(16)}${Math.random().toString(16).slice(2)}`
    .replace(/[^a-f0-9]/g, "")
    .padEnd(12, "0")
    .slice(0, 12);
  return `00000000-0000-4000-8000-${suffix}`;
}

function activeAttemptFor(questionId: string, attempts: PracticeAttempt[]): PracticeAttempt | undefined {
  return attempts
    .filter((attempt) => attempt.questionId === questionId && attempt.status === "in_progress")
    .sort((left, right) => new Date(right.startedAt).getTime() - new Date(left.startedAt).getTime())[0];
}

function mergeAttempts(local: PracticeAttempt[], remote: PracticeAttempt[]): PracticeAttempt[] {
  const merged = new Map<string, PracticeAttempt>();
  for (const attempt of local) merged.set(attempt.id, attempt);
  for (const attempt of remote) {
    const localAttempt = merged.get(attempt.id);
    // Never let a delayed progress response turn a locally confirmed review
    // back into an in-progress attempt.
    if (localAttempt?.status !== "in_progress" && attempt.status === "in_progress") continue;
    merged.set(attempt.id, attempt);
  }
  return [...merged.values()].sort(
    (left, right) => new Date(right.startedAt).getTime() - new Date(left.startedAt).getTime()
  );
}

function mergeProgress(local: LearnerSnapshot, remote: ProgressPayload): LearnerSnapshot {
  return {
    attempts: mergeAttempts(local.attempts, remote.attempts ?? []),
    // Keep an offline bookmark until the next successful explicit toggle sync.
    bookmarks: [...new Set([...local.bookmarks, ...(remote.bookmarks ?? [])])],
    mastery: remote.mastery?.length ? remote.mastery : local.mastery
  };
}

function messageFrom(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function LearnerProvider({ children }: PropsWithChildren): React.JSX.Element {
  const [snapshot, setSnapshot] = useState<LearnerSnapshot>(readSnapshot);
  const snapshotRef = useRef(snapshot);
  const startInFlightRef = useRef(new Map<string, Promise<PracticeAttempt>>());
  const completionOperationsRef = useRef(new Map<string, string>());
  const snapshotEpochRef = useRef(0);
  const skipNextSnapshotPersistRef = useRef(false);
  const erasureInFlightRef = useRef<Promise<EraseStudyDataResult> | undefined>(undefined);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("checking");
  const [syncMessage, setSyncMessage] = useState<string>();

  // Keeping this ref in lockstep lets closely spaced actions build on each
  // other before React has committed the next render.
  const updateSnapshot = useCallback((updater: (current: LearnerSnapshot) => LearnerSnapshot, expectedEpoch?: number) => {
    if (expectedEpoch !== undefined && expectedEpoch !== snapshotEpochRef.current) return;
    const next = updater(snapshotRef.current);
    snapshotRef.current = next;
    setSnapshot(next);
  }, []);

  useEffect(() => {
    if (skipNextSnapshotPersistRef.current) {
      skipNextSnapshotPersistRef.current = false;
      return;
    }
    writeSnapshot(snapshot);
  }, [snapshot]);

  const markOnline = useCallback(() => {
    setSyncStatus("online");
    setSyncMessage(undefined);
  }, []);

  const markSaveFailure = useCallback((error: unknown, offlineMessage: string) => {
    if (isTransportError(error)) {
      setSyncStatus("offline");
      setSyncMessage(offlineMessage);
      return;
    }

    setSyncStatus("error");
    setSyncMessage(messageFrom(error, "The study service could not save that change."));
  }, []);

  const resetLearnerSnapshot = useCallback(() => {
    // Invalidate all outstanding mutations before clearing. A delayed
    // progress/attempt response must never put erased history back into the UI
    // or browser storage.
    snapshotEpochRef.current += 1;
    startInFlightRef.current.clear();
    completionOperationsRef.current.clear();
    skipNextSnapshotPersistRef.current = true;
    const storageClear = clearInterviewArchitectStorage();

    const cleared = emptySnapshot();
    snapshotRef.current = cleared;
    setSnapshot(cleared);
    return storageClear;
  }, []);

  const refreshProgress = useCallback(async () => {
    const requestEpoch = snapshotEpochRef.current;
    try {
      await api.createAnonymousSession();
      if (requestEpoch !== snapshotEpochRef.current) return;
      const remote = await api.getProgress();
      if (requestEpoch !== snapshotEpochRef.current) return;
      updateSnapshot((current) => mergeProgress(current, remote), requestEpoch);
      markOnline();
    } catch (error) {
      if (requestEpoch !== snapshotEpochRef.current) return;
      markSaveFailure(error, "You are offline. Your local study data remains on this device.");
    }
  }, [markOnline, markSaveFailure, updateSnapshot]);

  useEffect(() => {
    void refreshProgress();
  }, [refreshProgress]);

  const startAttempt = useCallback(
    (
      questionId: string,
      questionVersion: number,
      mode: PracticeMode = "learn"
    ): Promise<PracticeAttempt> => {
      const existing = activeAttemptFor(questionId, snapshotRef.current.attempts);
      if (existing) return Promise.resolve(existing);

      const pending = startInFlightRef.current.get(questionId);
      if (pending) return pending;

      const provisional: PracticeAttempt = {
        id: idForLocalAttempt(),
        userId: "local-learner",
        questionId,
        questionVersion,
        mode,
        status: "in_progress",
        startedAt: new Date().toISOString()
      };
      const requestEpoch = snapshotEpochRef.current;

      updateSnapshot((current) => ({ ...current, attempts: [provisional, ...current.attempts] }));

      const request = api
        .startAttempt(questionId, questionVersion, mode)
        .then((response) => {
          updateSnapshot((current) => ({
            ...current,
            attempts: current.attempts.map((attempt) =>
              attempt.id === provisional.id ? response.attempt : attempt
            )
          }), requestEpoch);
          if (requestEpoch === snapshotEpochRef.current) markOnline();
          return response.attempt;
        })
        .catch((error: unknown) => {
          if (requestEpoch !== snapshotEpochRef.current) return provisional;
          if (isTransportError(error)) {
            markSaveFailure(error, "You are offline. This practice attempt is saved on this device.");
            return provisional;
          }

          updateSnapshot((current) => ({
            ...current,
            attempts: current.attempts.filter((attempt) => attempt.id !== provisional.id)
          }));
          markSaveFailure(error, "The study service could not start this attempt.");
          throw error;
        });

      startInFlightRef.current.set(questionId, request);
      void request.then(
        () => startInFlightRef.current.delete(questionId),
        () => startInFlightRef.current.delete(questionId)
      );
      return request;
    },
    [markOnline, markSaveFailure, updateSnapshot]
  );

  const completeAttempt = useCallback(
    async (
      attempt: PracticeAttempt,
      input: CompletionInput,
      suppliedOperationKey?: string
    ): Promise<CompletionAttemptResult> => {
      const requestEpoch = snapshotEpochRef.current;
      const optimistic: PracticeAttempt = {
        ...attempt,
        status: "completed",
        completedAt: new Date().toISOString(),
        durationSeconds: input.durationSeconds,
        selfScore: input.selfScore,
        rubricScores: input.rubricScores
      };
      updateSnapshot((current) => ({
        ...current,
        attempts: current.attempts.map((item) => (item.id === attempt.id ? optimistic : item))
      }));

      if (attempt.id.startsWith("local-")) return { attempt: optimistic, pendingSync: false };

      // A caller may provide a persisted key after reload. Otherwise retain a
      // generated key per attempt so a lost response can be replayed safely.
      const operationKey = suppliedOperationKey
        ?? completionOperationsRef.current.get(attempt.id)
        ?? newCompletionOperationKey();
      completionOperationsRef.current.set(attempt.id, operationKey);

      try {
        const response = await api.completeAttempt(attempt.id, {
          status: "completed",
          ...input
        }, operationKey);
        completionOperationsRef.current.delete(attempt.id);
        updateSnapshot((current) => ({
          ...current,
          attempts: current.attempts.map((item) => (item.id === attempt.id ? response.attempt : item)),
          mastery: response.mastery
            ? [
                ...current.mastery.filter((mastery) => mastery.topicId !== response.mastery?.topicId),
                response.mastery
              ]
            : current.mastery
        }), requestEpoch);
        if (requestEpoch === snapshotEpochRef.current) markOnline();
        return { attempt: response.attempt, pendingSync: false };
      } catch (error) {
        if (requestEpoch !== snapshotEpochRef.current) return { attempt: optimistic, pendingSync: false };
        if (isTransportError(error)) {
          markSaveFailure(error, "You are offline. Your review is saved on this device.");
          return { attempt: optimistic, pendingSync: true };
        }

        completionOperationsRef.current.delete(attempt.id);
        updateSnapshot((current) => ({
          ...current,
          attempts: current.attempts.map((item) => (item.id === attempt.id ? attempt : item))
        }));
        markSaveFailure(error, "The study service could not save your review.");
        throw error;
      }
    },
    [markOnline, markSaveFailure, updateSnapshot]
  );

  const abandonAttempt = useCallback(
    async (attempt: PracticeAttempt, durationSeconds: number) => {
      const requestEpoch = snapshotEpochRef.current;
      const abandoned: PracticeAttempt = { ...attempt, status: "abandoned", durationSeconds };
      updateSnapshot((current) => ({
        ...current,
        attempts: current.attempts.map((item) => (item.id === attempt.id ? abandoned : item))
      }));

      if (attempt.id.startsWith("local-")) return;
      try {
        await api.completeAttempt(attempt.id, { status: "abandoned", durationSeconds });
        if (requestEpoch === snapshotEpochRef.current) markOnline();
      } catch (error) {
        if (requestEpoch !== snapshotEpochRef.current) return;
        if (isTransportError(error)) {
          markSaveFailure(error, "You are offline. This discarded attempt is saved on this device.");
          return;
        }

        updateSnapshot((current) => ({
          ...current,
          attempts: current.attempts.map((item) => (item.id === attempt.id ? attempt : item))
        }));
        markSaveFailure(error, "The study service could not discard this attempt.");
        throw error;
      }
    },
    [markOnline, markSaveFailure, updateSnapshot]
  );

  const toggleBookmark = useCallback(
    async (questionId: string) => {
      const requestEpoch = snapshotEpochRef.current;
      const currentBookmarks = snapshotRef.current.bookmarks;
      const bookmarked = !currentBookmarks.includes(questionId);
      const nextBookmarks = bookmarked
        ? [...currentBookmarks, questionId]
        : currentBookmarks.filter((bookmark) => bookmark !== questionId);
      updateSnapshot((current) => ({ ...current, bookmarks: nextBookmarks }));

      try {
        await api.setBookmark(questionId, bookmarked);
        if (requestEpoch === snapshotEpochRef.current) markOnline();
      } catch (error) {
        if (requestEpoch !== snapshotEpochRef.current) return;
        if (isTransportError(error)) {
          markSaveFailure(error, "You are offline. Your bookmark is saved on this device.");
          return;
        }

        // The server explicitly rejected this write. Restore the previous
        // value instead of presenting an optimistic bookmark as saved.
        updateSnapshot((current) => {
          const isStillOptimistic = current.bookmarks.includes(questionId) === bookmarked;
          if (!isStillOptimistic) return current;
          return {
            ...current,
            bookmarks: bookmarked
              ? current.bookmarks.filter((bookmark) => bookmark !== questionId)
              : [...current.bookmarks, questionId]
          };
        });
        markSaveFailure(error, "The study service could not save this bookmark.");
      }
    },
    [markOnline, markSaveFailure, updateSnapshot]
  );

  const eraseStudyData = useCallback((): Promise<EraseStudyDataResult> => {
    if (erasureInFlightRef.current) return erasureInFlightRef.current;

    const request = (async (): Promise<EraseStudyDataResult> => {
      // Local data is intentionally left untouched until the server confirms
      // its transactional erase. A failed request therefore preserves the
      // learner's current study history.
      await api.deleteMe();
      const storageClear = resetLearnerSnapshot();
      setSyncStatus("checking");
      setSyncMessage(undefined);

      // The application needs an authenticated anonymous session for its next
      // action. Recreate an empty one without restoring any deleted data.
      try {
        await api.createAnonymousSession();
        if (storageClear.ok) {
          markOnline();
        } else {
          setSyncStatus("error");
          setSyncMessage("Your server study data was erased, but this browser could not confirm local cleanup.");
        }
        return { sessionReady: true };
      } catch (error) {
        markSaveFailure(
          error,
          "Your study data was erased. A new session will start when the study service is available."
        );
        return { sessionReady: false };
      }
    })();

    erasureInFlightRef.current = request;
    void request.then(
      () => {
        if (erasureInFlightRef.current === request) erasureInFlightRef.current = undefined;
      },
      (error: unknown) => {
        if (erasureInFlightRef.current === request) erasureInFlightRef.current = undefined;
        markSaveFailure(error, "We could not erase your study data. Your current history is still available.");
      }
    );
    return request;
  }, [markOnline, markSaveFailure, resetLearnerSnapshot]);

  const value = useMemo<LearnerContextValue>(
    () => ({
      ...snapshot,
      syncStatus,
      syncMessage,
      startAttempt,
      completeAttempt,
      abandonAttempt,
      toggleBookmark,
      refreshProgress,
      eraseStudyData
    }),
    [snapshot, syncStatus, syncMessage, startAttempt, completeAttempt, abandonAttempt, toggleBookmark, refreshProgress, eraseStudyData]
  );

  return <LearnerContext.Provider value={value}>{children}</LearnerContext.Provider>;
}

export function useLearner(): LearnerContextValue {
  const context = useContext(LearnerContext);
  if (!context) throw new Error("useLearner must be used within LearnerProvider.");
  return context;
}
