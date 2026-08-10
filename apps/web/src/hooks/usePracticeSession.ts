import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { InterviewQuestion, PracticeAttempt, PracticeMode, RubricDimension } from "@interview-architect/domain";
import {
  createPracticeArtifact,
  loadPendingCompletion,
  loadPracticeArtifact,
  removePendingCompletion,
  removePracticeArtifact,
  savePendingCompletion,
  savePracticeArtifact,
  type PendingCompletionV1,
  type PracticeArtifactV1,
  type StorageResult,
  type WorkspaceSectionId
} from "../lib/study-storage";
import { useLearner, type CompletionInput } from "./useLearner";

export type LocalSaveState = "idle" | "saving" | "saved" | "warning";

export interface PracticeFeedback {
  average: number;
  strengths: string[];
  gaps: string[];
  nextAction: string;
}

function activeAttemptFor(questionId: string, attempts: PracticeAttempt[]): PracticeAttempt | undefined {
  return attempts
    .filter((attempt) => attempt.questionId === questionId && attempt.status === "in_progress")
    .sort((left, right) => new Date(right.startedAt).getTime() - new Date(left.startedAt).getTime())[0];
}

interface CompletedArtifactSession {
  attempt: PracticeAttempt;
  artifact: PracticeArtifactV1;
}

/**
 * Completed notes are intentionally retained locally. Reopen only an
 * attempt-keyed canonical artifact: a current staging draft or legacy draft
 * must never be attached to a historical completed review.
 */
function completedArtifactSessionFor(
  question: InterviewQuestion,
  attempts: PracticeAttempt[],
  requestedAttemptId?: string
): CompletedArtifactSession | undefined {
  const candidates = attempts
    .filter((attempt) => attempt.questionId === question.id && attempt.status === "completed")
    .filter((attempt) => !requestedAttemptId || attempt.id === requestedAttemptId)
    .sort((left, right) => new Date(right.completedAt ?? right.startedAt).getTime() - new Date(left.completedAt ?? left.startedAt).getTime());

  for (const candidate of candidates) {
    const loaded = loadPracticeArtifact(
      {
        questionId: question.id,
        questionVersion: question.version,
        mode: candidate.mode,
        attemptId: candidate.id
      },
      undefined,
      { allowDraftPromotion: false }
    );
    if (loaded.ok && loaded.value) return { attempt: candidate, artifact: loaded.value };
  }

  return undefined;
}

function elapsedSince(startedAt: string): number {
  const timestamp = new Date(startedAt).getTime();
  return Number.isFinite(timestamp) ? Math.max(0, Math.floor((Date.now() - timestamp) / 1_000)) : 0;
}

function completionOperationKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  const suffix = `${Date.now().toString(16)}${Math.random().toString(16).slice(2)}`
    .replace(/[^a-f0-9]/g, "")
    .padEnd(12, "0")
    .slice(0, 12);
  return `00000000-0000-4000-8000-${suffix}`;
}

function rubricKey(dimension: RubricDimension): string {
  return dimension.dimension;
}

function feedbackFor(question: InterviewQuestion, rubricScores: Record<string, number>): PracticeFeedback | undefined {
  if (question.rubric.some((dimension) => rubricScores[rubricKey(dimension)] === undefined)) return undefined;

  const scored = question.rubric.map((dimension) => ({
    dimension,
    score: rubricScores[rubricKey(dimension)] ?? 0
  }));
  const totalWeight = scored.reduce((sum, item) => sum + item.dimension.weight, 0);
  const average = scored.reduce((sum, item) => sum + item.score * item.dimension.weight, 0) / totalWeight;
  const strongest = [...scored].sort((left, right) => right.score - left.score).slice(0, 2);
  const weakest = [...scored].sort((left, right) => left.score - right.score).slice(0, 2);
  const next = weakest[0];

  return {
    average,
    strengths: strongest.map(({ dimension, score }) => `${dimension.dimension}: ${score}/4 — keep making this signal explicit.`),
    gaps: weakest.map(({ dimension, score }) => `${dimension.dimension}: ${score}/4 — ${dimension.mustMention[0] ? `make “${dimension.mustMention[0]}” concrete next time.` : "name the evidence behind the decision."}`),
    nextAction: next
      ? `On your next run, spend two minutes rehearsing ${next.dimension.dimension.toLocaleLowerCase()} before you open the solution.`
      : "Run another timed prompt and name one tradeoff before selecting a component."
  };
}

function sameCompletionInput(left: CompletionInput, right: CompletionInput): boolean {
  if (left.durationSeconds !== right.durationSeconds || left.selfScore !== right.selfScore) return false;
  const leftKeys = Object.keys(left.rubricScores).sort();
  const rightKeys = Object.keys(right.rubricScores).sort();
  return leftKeys.length === rightKeys.length
    && leftKeys.every((key, index) => key === rightKeys[index] && left.rubricScores[key] === right.rubricScores[key]);
}

/**
 * Prefer a durable envelope after reload, but retain an in-memory copy for a
 * live tab where browser storage cannot be written or read. In both cases the
 * key and numeric request body are returned unchanged.
 */
export function pendingCompletionForAttempt(
  attemptId: string,
  persisted: StorageResult<PendingCompletionV1 | undefined>,
  inMemory?: PendingCompletionV1
): PendingCompletionV1 | undefined {
  if (persisted.ok && persisted.value) return persisted.value;
  return inMemory?.attemptId === attemptId ? inMemory : undefined;
}

export interface UsePracticeSessionResult {
  attempt: PracticeAttempt | null;
  mode: PracticeMode;
  modeMismatch: boolean;
  artifact: PracticeArtifactV1;
  elapsedSeconds: number;
  isRunning: boolean;
  isStarting: boolean;
  isCompleting: boolean;
  isCompleted: boolean;
  isReviewOpen: boolean;
  isAwaitingRetry: boolean;
  isAbandonConfirmationOpen: boolean;
  saveState: LocalSaveState;
  error?: string;
  syncStatus: ReturnType<typeof useLearner>["syncStatus"];
  bookmarked: boolean;
  hintsRevealed: number;
  answerRevealed: boolean;
  rubricScores: Record<string, number>;
  selfScore: number | null;
  missingDimensions: string[];
  feedback?: PracticeFeedback;
  canComplete: boolean;
  canRevealProbe: boolean;
  start: () => Promise<void>;
  startAnother: () => Promise<void>;
  toggleTimer: () => void;
  revealHint: () => void;
  revealAnswer: () => void;
  revealProbe: () => void;
  updateProbeResponse: (index: number, response: string) => void;
  updateSection: (section: WorkspaceSectionId, value: string) => void;
  setRubricScore: (dimension: string, score: number) => void;
  setSelfScore: (score: number) => void;
  openReview: () => void;
  complete: () => Promise<void>;
  retryCompletion: () => Promise<void>;
  requestAbandon: () => void;
  cancelAbandon: () => void;
  confirmAbandon: () => Promise<void>;
  toggleBookmark: () => Promise<void>;
}

/**
 * The single lifecycle owner for the Design Studio. Visual components receive
 * compact state/actions and never interact with browser storage or the API.
 */
export function usePracticeSession(
  question: InterviewQuestion,
  requestedMode: PracticeMode,
  requestedReviewAttemptId?: string
): UsePracticeSessionResult {
  const {
    attempts,
    bookmarks,
    syncStatus,
    startAttempt,
    completeAttempt,
    abandonAttempt,
    toggleBookmark: toggleLearnerBookmark
  } = useLearner();
  const initialActive = activeAttemptFor(question.id, attempts);
  const [initialCompleted] = useState<CompletedArtifactSession | undefined>(() => (
    initialActive ? undefined : completedArtifactSessionFor(question, attempts, requestedReviewAttemptId)
  ));
  const initialAttempt = initialActive ?? initialCompleted?.attempt ?? null;
  const [attempt, setAttempt] = useState<PracticeAttempt | null>(initialAttempt);
  const mode = attempt?.mode ?? requestedMode;
  const [artifact, setArtifact] = useState<PracticeArtifactV1>(() => initialCompleted?.artifact ?? createPracticeArtifact({
    questionId: question.id,
    questionVersion: question.version,
    mode: initialAttempt?.mode ?? requestedMode,
    attemptId: initialAttempt?.id
  }));
  const [elapsedSeconds, setElapsedSeconds] = useState(() => initialAttempt
    ? initialAttempt.status === "completed"
      ? initialAttempt.durationSeconds ?? elapsedSince(initialAttempt.startedAt)
      : elapsedSince(initialAttempt.startedAt)
    : 0);
  const [isRunning, setIsRunning] = useState(Boolean(initialActive));
  const [isStarting, setIsStarting] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [saveState, setSaveState] = useState<LocalSaveState>(initialCompleted ? "saved" : "idle");
  const [rubricScores, setRubricScores] = useState<Record<string, number>>(initialCompleted?.attempt.rubricScores ?? {});
  const [selfScore, setSelfScore] = useState<number | null>(initialCompleted?.attempt.selfScore ?? null);
  const [isReviewOpen, setIsReviewOpen] = useState(Boolean(initialCompleted));
  const [isCompleted, setIsCompleted] = useState(Boolean(initialCompleted));
  const [isAwaitingRetry, setIsAwaitingRetry] = useState(false);
  const [isAbandonConfirmationOpen, setIsAbandonConfirmationOpen] = useState(false);
  const [error, setError] = useState<string>();
  const artifactRef = useRef(artifact);
  // Storage can be unavailable for a live tab (privacy mode, quota or a
  // browser extension). Keep the retry envelope in memory as well so a user
  // never loses the exact idempotency key during that tab's lifetime.
  const pendingCompletionRef = useRef<PendingCompletionV1 | undefined>(undefined);
  const saveEpochRef = useRef(0);
  const previousQuestionIdRef = useRef(question.id);

  const activeFromSnapshot = activeAttemptFor(question.id, attempts);
  const artifactScope = `${question.id}:${question.version}:${mode}:${attempt?.id ?? "staging"}`;
  const modeMismatch = Boolean(attempt && attempt.mode !== requestedMode);
  const missingDimensions = question.rubric
    .filter((dimension) => rubricScores[rubricKey(dimension)] === undefined)
    .map((dimension) => dimension.dimension);
  const canComplete = Boolean(attempt) && selfScore !== null && missingDimensions.length === 0 && !isCompleting;
  const latestProbe = artifact.probes[artifact.probes.length - 1];
  const canRevealProbe = mode !== "mock" || !latestProbe || Boolean(latestProbe.response.trim());
  const feedback = useMemo(() => feedbackFor(question, rubricScores), [question, rubricScores]);

  useEffect(() => {
    artifactRef.current = artifact;
  }, [artifact]);

  // Progress hydrates after the static route. Its persisted mode wins over a
  // deep-link mode without creating a second attempt.
  useEffect(() => {
    if (!activeFromSnapshot || attempt?.id === activeFromSnapshot.id || isCompleted) return;
    setAttempt(activeFromSnapshot);
    setElapsedSeconds(elapsedSince(activeFromSnapshot.startedAt));
    setIsRunning(true);
    setError(undefined);
  }, [activeFromSnapshot, attempt?.id, isCompleted]);

  // A finished attempt does not need an active server lifecycle, but its
  // canonical local artifact remains valuable for personal review. Restore it
  // after a normal reload or an explicit recent-attempt link.
  useEffect(() => {
    if (activeFromSnapshot || attempt?.status === "in_progress" || attempt?.status === "completed") return;
    const recovered = completedArtifactSessionFor(question, attempts, requestedReviewAttemptId);
    if (!recovered) return;

    saveEpochRef.current += 1;
    setAttempt(recovered.attempt);
    setArtifact(recovered.artifact);
    setElapsedSeconds(recovered.attempt.durationSeconds ?? elapsedSince(recovered.attempt.startedAt));
    setIsRunning(false);
    setIsReviewOpen(true);
    setIsCompleted(true);
    setIsAwaitingRetry(false);
    setIsAbandonConfirmationOpen(false);
    setRubricScores(recovered.attempt.rubricScores ?? {});
    setSelfScore(recovered.attempt.selfScore ?? null);
    setSaveState("saved");
    setError(undefined);
  }, [activeFromSnapshot, attempt?.status, attempts, question, requestedReviewAttemptId]);

  useEffect(() => {
    if (previousQuestionIdRef.current === question.id) return;
    previousQuestionIdRef.current = question.id;
    saveEpochRef.current += 1;
    const active = activeAttemptFor(question.id, attempts);
    setAttempt(active ?? null);
    setElapsedSeconds(active ? elapsedSince(active.startedAt) : 0);
    setIsRunning(Boolean(active));
    setRubricScores({});
    setSelfScore(null);
    setIsReviewOpen(false);
    setIsCompleted(false);
    setIsAwaitingRetry(false);
    pendingCompletionRef.current = undefined;
    setIsAbandonConfirmationOpen(false);
    setError(undefined);
    window.scrollTo(0, 0);
  }, [attempts, question.id]);

  // Keep the private artifact tied to the effective server mode and attempt.
  useEffect(() => {
    const locator = { questionId: question.id, questionVersion: question.version, mode, attemptId: attempt?.id };
    const loaded = loadPracticeArtifact(locator);
    const next = loaded.ok && loaded.value ? loaded.value : createPracticeArtifact(locator);
    saveEpochRef.current += 1;
    setArtifact(next);
    setSaveState(loaded.ok ? (loaded.value ? "saved" : "idle") : "warning");
  }, [artifactScope, attempt?.id, mode, question.id, question.version]);

  // A timed-out completion is discoverable after a reload. This also checks
  // an optimistic in-progress snapshot: a transport failure is allowed to
  // leave that status behind until the exact persisted request is replayed.
  useEffect(() => {
    const candidates = [
      activeFromSnapshot,
      ...attempts.filter((item) => item.questionId === question.id && item.status === "completed")
    ]
      .filter((item): item is PracticeAttempt => Boolean(item))
      .filter((item, index, items) => items.findIndex((candidate) => candidate.id === item.id) === index)
      .sort((left, right) => new Date(right.completedAt ?? right.startedAt).getTime() - new Date(left.completedAt ?? left.startedAt).getTime());
    for (const candidate of candidates) {
      const pending = loadPendingCompletion(candidate.id);
      if (!pending.ok || !pending.value) continue;
      pendingCompletionRef.current = pending.value;
      // The retry UI is a local view of the request envelope. Do not mutate
      // the provider snapshot here; it remains authoritative once retry gets
      // a server response.
      setAttempt({
        ...candidate,
        status: "completed",
        completedAt: candidate.completedAt ?? pending.value.updatedAt,
        durationSeconds: pending.value.input.durationSeconds,
        selfScore: pending.value.input.selfScore,
        rubricScores: pending.value.input.rubricScores
      });
      setRubricScores(pending.value.input.rubricScores);
      setSelfScore(pending.value.input.selfScore);
      setIsReviewOpen(true);
      setIsCompleted(true);
      setIsAwaitingRetry(true);
      setIsRunning(false);
      break;
    }
  }, [activeFromSnapshot, attempts, question.id]);

  useEffect(() => {
    if (!attempt || attempt.status !== "in_progress" || !isRunning || isCompleted) return;
    const timer = window.setInterval(() => {
      if (attempt.mode === "mock") {
        // Mock elapsed time remains truthful when a browser throttles timers in
        // a background tab; Learn may deliberately pause in this session.
        setElapsedSeconds(elapsedSince(attempt.startedAt));
      } else {
        setElapsedSeconds((current) => current + 1);
      }
    }, 1_000);
    return () => window.clearInterval(timer);
  }, [attempt, isCompleted, isRunning]);

  useEffect(() => {
    const current = artifact;
    if (current.questionId !== question.id || current.questionVersion !== question.version || current.mode !== mode || current.attemptId !== attempt?.id) {
      return;
    }
    const epoch = saveEpochRef.current;
    setSaveState("saving");
    const timeout = window.setTimeout(() => {
      if (epoch !== saveEpochRef.current) return;
      const saved = savePracticeArtifact(current);
      setSaveState(saved.ok ? "saved" : "warning");
    }, 400);
    return () => window.clearTimeout(timeout);
  }, [artifact, attempt?.id, mode, question.id, question.version]);

  useEffect(() => {
    const saveOnExit = () => {
      const current = artifactRef.current;
      if (current.questionId === question.id && current.questionVersion === question.version && current.mode === mode && current.attemptId === attempt?.id) {
        void savePracticeArtifact(current);
      }
    };
    window.addEventListener("pagehide", saveOnExit);
    return () => window.removeEventListener("pagehide", saveOnExit);
  }, [attempt?.id, mode, question.id, question.version]);

  const updateArtifact = useCallback((updater: (current: PracticeArtifactV1) => PracticeArtifactV1) => {
    setArtifact((current) => ({ ...updater(current), updatedAt: new Date().toISOString() }));
  }, []);

  const start = useCallback(async () => {
    if (attempt?.status === "in_progress") {
      setIsRunning(true);
      return;
    }
    if (syncStatus === "checking") {
      setError("Your existing practice session is still loading. Try again in a moment.");
      return;
    }
    setIsStarting(true);
    setError(undefined);
    try {
      const created = await startAttempt(question.id, question.version, requestedMode);
      setAttempt(created);
      setElapsedSeconds(0);
      setIsRunning(true);
      setIsCompleted(false);
      setIsAwaitingRetry(false);
      pendingCompletionRef.current = undefined;
      setIsReviewOpen(false);
      setRubricScores({});
      setSelfScore(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The study service could not start this attempt.");
    } finally {
      setIsStarting(false);
    }
  }, [attempt?.status, requestedMode, question.id, question.version, startAttempt, syncStatus]);

  const startAnother = useCallback(async () => {
    if (attempt?.status === "in_progress") return;
    setAttempt(null);
    setElapsedSeconds(0);
    setIsCompleted(false);
    setIsAwaitingRetry(false);
    pendingCompletionRef.current = undefined;
    setIsReviewOpen(false);
    setRubricScores({});
    setSelfScore(null);
    await start();
  }, [attempt?.status, start]);

  const toggleTimer = useCallback(() => {
    if (!attempt || attempt.status !== "in_progress" || attempt.mode === "mock") return;
    setIsRunning((current) => !current);
  }, [attempt]);

  const revealHint = useCallback(() => {
    if (mode !== "learn" || isCompleted || artifact.revealed.hints >= question.hints.length) return;
    updateArtifact((current) => ({
      ...current,
      revealed: { ...current.revealed, hints: Math.min(question.hints.length, current.revealed.hints + 1) }
    }));
  }, [artifact.revealed.hints, isCompleted, mode, question.hints.length, updateArtifact]);

  const revealAnswer = useCallback(() => {
    if (mode !== "learn" || isCompleted) return;
    updateArtifact((current) => ({ ...current, revealed: { ...current.revealed, answer: true } }));
    setIsReviewOpen(true);
  }, [isCompleted, mode, updateArtifact]);

  const revealProbe = useCallback(() => {
    if (isCompleted) return;
    const nextIndex = artifact.probes.length;
    if (nextIndex >= question.prompt.followUps.length) return;
    const latest = artifact.probes[nextIndex - 1];
    if (mode === "mock" && latest && !latest.response.trim()) {
      setError("Answer the current interviewer probe before asking for another.");
      return;
    }
    setError(undefined);
    updateArtifact((current) => ({
      ...current,
      probes: [...current.probes, { index: nextIndex, response: "", revealedAt: new Date().toISOString() }]
    }));
  }, [artifact.probes, isCompleted, mode, question.prompt.followUps.length, updateArtifact]);

  const updateProbeResponse = useCallback((index: number, response: string) => {
    if (isCompleted) return;
    updateArtifact((current) => ({
      ...current,
      probes: current.probes.map((probe) => probe.index === index ? { ...probe, response } : probe)
    }));
  }, [isCompleted, updateArtifact]);

  const updateSection = useCallback((section: WorkspaceSectionId, value: string) => {
    if (isCompleted) return;
    updateArtifact((current) => ({ ...current, sections: { ...current.sections, [section]: value } }));
  }, [isCompleted, updateArtifact]);

  const setRubricScore = useCallback((dimension: string, score: number) => {
    if (!isCompleted) setRubricScores((current) => ({ ...current, [dimension]: score }));
  }, [isCompleted]);

  const setSessionSelfScore = useCallback((score: number) => {
    if (!isCompleted) setSelfScore(score);
  }, [isCompleted]);

  const openReview = useCallback(() => {
    if (!attempt) {
      setError("Start the session before you complete the review.");
      return;
    }
    setIsReviewOpen(true);
    setIsRunning(false);
    setError(undefined);
  }, [attempt]);

  const submitCompletion = useCallback(async (retryOnly: boolean) => {
    if (isCompleted && (!retryOnly || !isAwaitingRetry)) return;
    const workingAttempt = attempt;
    if (!workingAttempt) {
      setError("Start the session before you complete the review.");
      return;
    }
    if (syncStatus === "checking") {
      setError("Your existing practice session is still loading. Try again in a moment.");
      return;
    }

    const currentInput: CompletionInput = {
      durationSeconds: Math.max(1, elapsedSeconds),
      selfScore: selfScore ?? 0,
      rubricScores
    };
    const existing = loadPendingCompletion(workingAttempt.id);
    const retainedPending = pendingCompletionForAttempt(
      workingAttempt.id,
      existing,
      pendingCompletionRef.current
    );
    if (retryOnly && !retainedPending) {
      setError("This review could not be retried because its private retry record is unavailable. Please score it again.");
      return;
    }

    if (!retryOnly && (selfScore === null || missingDimensions.length > 0)) {
      setError(missingDimensions.length
        ? `${missingDimensions.length} rubric ${missingDimensions.length === 1 ? "dimension remains" : "dimensions remain"} unrated.`
        : "Choose an overall self-score before completing the review.");
      setIsReviewOpen(true);
      return;
    }
    if (retainedPending && !retryOnly && !sameCompletionInput(retainedPending.input, currentInput)) {
      setError("A previous completion is waiting to sync. Retry it before changing this review.");
      setIsAwaitingRetry(true);
      return;
    }

    const pending: PendingCompletionV1 = retainedPending
      ? retainedPending
      : {
          version: 1,
          attemptId: workingAttempt.id,
          operationKey: completionOperationKey(),
          input: currentInput,
          updatedAt: new Date().toISOString()
        };
    pendingCompletionRef.current = pending;

    const stored = savePendingCompletion(pending);
    if (!stored.ok) setSaveState("warning");
    setIsCompleting(true);
    setError(undefined);
    try {
      const result = await completeAttempt(workingAttempt, pending.input, pending.operationKey);
      setAttempt(result.attempt);
      setIsCompleted(true);
      setIsRunning(false);
      setIsReviewOpen(true);
      if (result.pendingSync) {
        setIsAwaitingRetry(true);
        setError("Your review is saved on this device and is waiting to sync. Retry when you are back online.");
      } else {
        void removePendingCompletion(workingAttempt.id);
        pendingCompletionRef.current = undefined;
        setIsAwaitingRetry(false);
      }
    } catch (caught) {
      void removePendingCompletion(workingAttempt.id);
      pendingCompletionRef.current = undefined;
      setAttempt(workingAttempt);
      setIsRunning(true);
      setError(caught instanceof Error ? caught.message : "The study service could not save your review.");
    } finally {
      setIsCompleting(false);
    }
  }, [attempt, completeAttempt, elapsedSeconds, isAwaitingRetry, isCompleted, missingDimensions, rubricScores, selfScore, syncStatus]);

  const complete = useCallback(async () => submitCompletion(false), [submitCompletion]);
  const retryCompletion = useCallback(async () => submitCompletion(true), [submitCompletion]);

  const requestAbandon = useCallback(() => {
    if (attempt?.status === "in_progress") setIsAbandonConfirmationOpen(true);
  }, [attempt?.status]);

  const cancelAbandon = useCallback(() => setIsAbandonConfirmationOpen(false), []);

  const confirmAbandon = useCallback(async () => {
    if (!attempt || attempt.status !== "in_progress") return;
    setError(undefined);
    try {
      const result = await abandonAttempt(attempt, elapsedSeconds);
      if (!result.confirmed) {
        setIsAbandonConfirmationOpen(false);
        setError("We could not confirm the discard. Your private notes are still available, so this session remains open. Try again after you reconnect.");
        return;
      }
      saveEpochRef.current += 1;
      void removePracticeArtifact({
        questionId: question.id,
        questionVersion: question.version,
        mode: attempt.mode,
        attemptId: attempt.id
      });
      void removePendingCompletion(attempt.id);
      pendingCompletionRef.current = undefined;
      setAttempt(null);
      setIsRunning(false);
      setElapsedSeconds(0);
      setIsAbandonConfirmationOpen(false);
      setIsReviewOpen(false);
      setRubricScores({});
      setSelfScore(null);
      setArtifact(createPracticeArtifact({ questionId: question.id, questionVersion: question.version, mode: attempt.mode }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The study service could not discard this attempt.");
    }
  }, [abandonAttempt, attempt, elapsedSeconds, question.id, question.version]);

  const toggleBookmark = useCallback(async () => {
    await toggleLearnerBookmark(question.id);
  }, [question.id, toggleLearnerBookmark]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      const editing = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement;
      if (editing || event.metaKey || event.ctrlKey || event.altKey) return;
      const key = event.key.toLocaleLowerCase();
      if (key === "h" && mode === "learn" && artifact.revealed.hints < question.hints.length) {
        event.preventDefault();
        revealHint();
      }
      if (key === "b") {
        event.preventDefault();
        void toggleBookmark();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [artifact.revealed.hints, mode, question.hints.length, revealHint, toggleBookmark]);

  return {
    attempt,
    mode,
    modeMismatch,
    artifact,
    elapsedSeconds,
    isRunning,
    isStarting,
    isCompleting,
    isCompleted,
    isReviewOpen,
    isAwaitingRetry,
    isAbandonConfirmationOpen,
    saveState,
    error,
    syncStatus,
    bookmarked: bookmarks.includes(question.id),
    hintsRevealed: artifact.revealed.hints,
    answerRevealed: artifact.revealed.answer,
    rubricScores,
    selfScore,
    missingDimensions,
    feedback,
    canComplete,
    canRevealProbe,
    start,
    startAnother,
    toggleTimer,
    revealHint,
    revealAnswer,
    revealProbe,
    updateProbeResponse,
    updateSection,
    setRubricScore,
    setSelfScore: setSessionSelfScore,
    openReview,
    complete,
    retryCompletion,
    requestAbandon,
    cancelAbandon,
    confirmAbandon,
    toggleBookmark
  };
}
