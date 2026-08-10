import type { PracticeMode } from "@interview-architect/domain";

/**
 * Browser storage is deliberately owned in one place.  It gives the product a
 * reliable client-side erase boundary and keeps private workspace text out of
 * the learner API contracts.
 */
export const STUDY_STORAGE_PREFIX = "interview-architect:";
export const LEARNER_SNAPSHOT_KEY = `${STUDY_STORAGE_PREFIX}learner:v1`;
const LEGACY_DRAFT_PREFIX = `${STUDY_STORAGE_PREFIX}draft:`;
const STUDIO_STORAGE_PREFIX = `${STUDY_STORAGE_PREFIX}studio:v1:`;

export const WORKSPACE_SECTION_IDS = [
  "clarifications",
  "scale",
  "architecture",
  "apiAndDataModel",
  "reliability",
  "observabilityAndSecurity",
  "tradeoffs",
  "reflection"
] as const;

export type WorkspaceSectionId = (typeof WORKSPACE_SECTION_IDS)[number];
export type WorkspaceSections = Record<WorkspaceSectionId, string>;

export interface PracticeProbeResponse {
  index: number;
  response: string;
  revealedAt: string;
}

/** The versioned, private artifact persisted only in browser storage. */
export interface PracticeArtifactV1 {
  version: 1;
  attemptId?: string;
  questionId: string;
  questionVersion: number;
  mode: PracticeMode;
  updatedAt: string;
  sections: WorkspaceSections;
  probes: PracticeProbeResponse[];
  revealed: { hints: number; answer: boolean };
}

/**
 * This contains only a completion request's numeric metadata, never a
 * workspace section or interviewer response.  Retaining it lets a timeout
 * replay the exact same idempotent request after a reload.
 */
export interface PendingCompletionV1 {
  version: 1;
  attemptId: string;
  operationKey: string;
  input: {
    durationSeconds: number;
    selfScore: number;
    rubricScores: Record<string, number>;
  };
  updatedAt: string;
}

export interface ArtifactLocator {
  questionId: string;
  questionVersion: number;
  mode: PracticeMode;
  attemptId?: string;
}

/**
 * Completed reviews must only reopen their own canonical artifact. A staging
 * draft belongs to a new, not-yet-started session and must never be promoted
 * into an older completed attempt just because both share a question.
 */
export interface LoadPracticeArtifactOptions {
  allowDraftPromotion?: boolean;
}

export interface StorageLike {
  readonly length: number;
  key(index: number): string | null;
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export type StorageResult<T> =
  | { ok: true; value: T }
  | { ok: false; reason: "unavailable" | "quota" | "corrupt" | "partial" };

export interface StorageClearResult {
  ok: boolean;
  removedKeys: string[];
  failedKeys: string[];
  reason?: "unavailable" | "partial";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isPracticeMode(value: unknown): value is PracticeMode {
  return value === "learn" || value === "mock";
}

function browserStorage(override?: StorageLike): StorageLike | undefined {
  if (override) return override;
  if (typeof window === "undefined") return undefined;

  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

function emptySections(): WorkspaceSections {
  return {
    clarifications: "",
    scale: "",
    architecture: "",
    apiAndDataModel: "",
    reliability: "",
    observabilityAndSecurity: "",
    tradeoffs: "",
    reflection: ""
  };
}

function encodePart(value: string | number): string {
  return encodeURIComponent(String(value));
}

function stagingKey(locator: Omit<ArtifactLocator, "attemptId">): string {
  return `${STUDIO_STORAGE_PREFIX}staging:${encodePart(locator.questionId)}:${locator.questionVersion}:${locator.mode}`;
}

function attemptKey(attemptId: string): string {
  return `${STUDIO_STORAGE_PREFIX}attempt:${encodePart(attemptId)}`;
}

function completionKey(attemptId: string): string {
  return `${STUDIO_STORAGE_PREFIX}completion:${encodePart(attemptId)}`;
}

function legacyDraftKey(questionId: string): string {
  return `${LEGACY_DRAFT_PREFIX}${questionId}`;
}

function safeGet(storage: StorageLike, key: string): StorageResult<string | null> {
  try {
    return { ok: true, value: storage.getItem(key) };
  } catch {
    return { ok: false, reason: "unavailable" };
  }
}

function safeSet(storage: StorageLike, key: string, value: string): StorageResult<void> {
  try {
    storage.setItem(key, value);
    return { ok: true, value: undefined };
  } catch {
    return { ok: false, reason: "quota" };
  }
}

function safeRemove(storage: StorageLike, key: string): StorageResult<void> {
  try {
    storage.removeItem(key);
    return { ok: true, value: undefined };
  } catch {
    return { ok: false, reason: "partial" };
  }
}

function sameArtifactTarget(artifact: PracticeArtifactV1, locator: ArtifactLocator): boolean {
  return artifact.questionId === locator.questionId
    && artifact.questionVersion === locator.questionVersion
    && artifact.mode === locator.mode
    && (locator.attemptId ? artifact.attemptId === locator.attemptId : !artifact.attemptId);
}

function parseSections(value: unknown): WorkspaceSections | undefined {
  if (!isRecord(value)) return undefined;
  const sections = emptySections();
  for (const id of WORKSPACE_SECTION_IDS) {
    if (typeof value[id] !== "string") return undefined;
    sections[id] = value[id];
  }
  return sections;
}

function parseArtifact(raw: string): PracticeArtifactV1 | undefined {
  try {
    const value: unknown = JSON.parse(raw);
    if (!isRecord(value) || value.version !== 1 || typeof value.questionId !== "string") return undefined;
    if (typeof value.questionVersion !== "number" || !Number.isInteger(value.questionVersion) || value.questionVersion < 1 || !isPracticeMode(value.mode)) return undefined;
    if (typeof value.updatedAt !== "string" || (value.attemptId !== undefined && typeof value.attemptId !== "string")) return undefined;
    const sections = parseSections(value.sections);
    if (!sections || !Array.isArray(value.probes) || !isRecord(value.revealed)) return undefined;
    if (typeof value.revealed.hints !== "number" || !Number.isInteger(value.revealed.hints) || value.revealed.hints < 0 || typeof value.revealed.answer !== "boolean") return undefined;

    const probes: PracticeProbeResponse[] = [];
    for (const probe of value.probes) {
      if (!isRecord(probe) || typeof probe.index !== "number" || !Number.isInteger(probe.index) || probe.index < 0 || typeof probe.response !== "string" || typeof probe.revealedAt !== "string") {
        return undefined;
      }
      probes.push({ index: probe.index, response: probe.response, revealedAt: probe.revealedAt });
    }

    return {
      version: 1,
      attemptId: typeof value.attemptId === "string" ? value.attemptId : undefined,
      questionId: value.questionId,
      questionVersion: value.questionVersion,
      mode: value.mode,
      updatedAt: value.updatedAt,
      sections,
      probes,
      revealed: { hints: value.revealed.hints, answer: value.revealed.answer }
    };
  } catch {
    return undefined;
  }
}

function parsePendingCompletion(raw: string): PendingCompletionV1 | undefined {
  try {
    const value: unknown = JSON.parse(raw);
    if (!isRecord(value) || value.version !== 1 || typeof value.attemptId !== "string" || typeof value.operationKey !== "string" || typeof value.updatedAt !== "string" || !isRecord(value.input)) {
      return undefined;
    }
    const { durationSeconds, selfScore, rubricScores } = value.input;
    if (typeof durationSeconds !== "number" || typeof selfScore !== "number" || !Number.isFinite(durationSeconds) || !Number.isFinite(selfScore) || !isRecord(rubricScores)) return undefined;
    const normalizedScores: Record<string, number> = {};
    for (const [dimension, score] of Object.entries(rubricScores)) {
      if (typeof score !== "number" || !Number.isFinite(score)) return undefined;
      normalizedScores[dimension] = score;
    }
    return {
      version: 1,
      attemptId: value.attemptId,
      operationKey: value.operationKey,
      input: { durationSeconds, selfScore, rubricScores: normalizedScores },
      updatedAt: value.updatedAt
    };
  } catch {
    return undefined;
  }
}

function readArtifactAt(storage: StorageLike, key: string, locator: ArtifactLocator): StorageResult<PracticeArtifactV1 | undefined> {
  const raw = safeGet(storage, key);
  if (!raw.ok) return raw;
  if (!raw.value) return { ok: true, value: undefined };
  const artifact = parseArtifact(raw.value);
  if (!artifact) return { ok: false, reason: "corrupt" };
  return { ok: true, value: sameArtifactTarget(artifact, locator) ? artifact : undefined };
}

function withAttempt(artifact: PracticeArtifactV1, locator: ArtifactLocator): PracticeArtifactV1 {
  return {
    ...artifact,
    attemptId: locator.attemptId,
    questionId: locator.questionId,
    questionVersion: locator.questionVersion,
    mode: locator.mode
  };
}

export function createPracticeArtifact(locator: ArtifactLocator): PracticeArtifactV1 {
  return {
    version: 1,
    attemptId: locator.attemptId,
    questionId: locator.questionId,
    questionVersion: locator.questionVersion,
    mode: locator.mode,
    updatedAt: new Date().toISOString(),
    sections: emptySections(),
    probes: [],
    revealed: { hints: 0, answer: false }
  };
}

/**
 * Read a private workspace artifact. If an attempt is now available, a valid
 * staging artifact is promoted only after its canonical attempt write succeeds.
 * A legacy free-text draft is migrated into the architecture section using the
 * same write-before-delete rule.
 */
export function loadPracticeArtifact(
  locator: ArtifactLocator,
  override?: StorageLike,
  options: LoadPracticeArtifactOptions = {}
): StorageResult<PracticeArtifactV1 | undefined> {
  const storage = browserStorage(override);
  if (!storage) return { ok: false, reason: "unavailable" };
  const allowDraftPromotion = options.allowDraftPromotion ?? true;

  const stagingLocator: ArtifactLocator = { ...locator, attemptId: undefined };
  const canonicalKey = locator.attemptId ? attemptKey(locator.attemptId) : stagingKey(stagingLocator);
  const canonical = readArtifactAt(storage, canonicalKey, locator);
  if (!canonical.ok) return canonical;

  let candidate = canonical.value;
  let candidateWasStaged = false;
  if (!candidate && locator.attemptId && allowDraftPromotion) {
    const staged = readArtifactAt(storage, stagingKey(stagingLocator), stagingLocator);
    if (!staged.ok) return staged;
    candidate = staged.value;
    candidateWasStaged = Boolean(candidate);
  }

  if (candidate) {
    const normalized = locator.attemptId ? withAttempt(candidate, locator) : candidate;
    if (candidateWasStaged) {
      const promoted = safeSet(storage, canonicalKey, JSON.stringify(normalized));
      if (!promoted.ok) return promoted;
      void safeRemove(storage, stagingKey(stagingLocator));
    }
    return { ok: true, value: normalized };
  }

  if (!allowDraftPromotion) return { ok: true, value: undefined };

  const legacy = safeGet(storage, legacyDraftKey(locator.questionId));
  if (!legacy.ok) return legacy;
  if (!legacy.value) return { ok: true, value: undefined };

  const migrated = createPracticeArtifact(locator);
  migrated.sections.architecture = legacy.value;
  const saved = safeSet(storage, canonicalKey, JSON.stringify(migrated));
  if (!saved.ok) return saved;
  // The modern artifact is durable before the legacy private text is removed.
  void safeRemove(storage, legacyDraftKey(locator.questionId));
  return { ok: true, value: migrated };
}

export function savePracticeArtifact(artifact: PracticeArtifactV1, override?: StorageLike): StorageResult<void> {
  const storage = browserStorage(override);
  if (!storage) return { ok: false, reason: "unavailable" };
  const key = artifact.attemptId
    ? attemptKey(artifact.attemptId)
    : stagingKey({ questionId: artifact.questionId, questionVersion: artifact.questionVersion, mode: artifact.mode });
  return safeSet(storage, key, JSON.stringify(artifact));
}

/** Remove the active attempt artifact and any matching pre-start staging draft. */
export function removePracticeArtifact(locator: ArtifactLocator, override?: StorageLike): StorageResult<void> {
  const storage = browserStorage(override);
  if (!storage) return { ok: false, reason: "unavailable" };
  const keys = [stagingKey({ questionId: locator.questionId, questionVersion: locator.questionVersion, mode: locator.mode })];
  if (locator.attemptId) keys.unshift(attemptKey(locator.attemptId));

  for (const key of keys) {
    const removed = safeRemove(storage, key);
    if (!removed.ok) return removed;
  }
  return { ok: true, value: undefined };
}

export function loadPendingCompletion(attemptId: string, override?: StorageLike): StorageResult<PendingCompletionV1 | undefined> {
  const storage = browserStorage(override);
  if (!storage) return { ok: false, reason: "unavailable" };
  const raw = safeGet(storage, completionKey(attemptId));
  if (!raw.ok) return raw;
  if (!raw.value) return { ok: true, value: undefined };
  const pending = parsePendingCompletion(raw.value);
  if (!pending || pending.attemptId !== attemptId) return { ok: false, reason: "corrupt" };
  return { ok: true, value: pending };
}

export function savePendingCompletion(pending: PendingCompletionV1, override?: StorageLike): StorageResult<void> {
  const storage = browserStorage(override);
  if (!storage) return { ok: false, reason: "unavailable" };
  return safeSet(storage, completionKey(pending.attemptId), JSON.stringify(pending));
}

export function removePendingCompletion(attemptId: string, override?: StorageLike): StorageResult<void> {
  const storage = browserStorage(override);
  if (!storage) return { ok: false, reason: "unavailable" };
  return safeRemove(storage, completionKey(attemptId));
}

/**
 * Explicitly enumerate app-owned keys. Never use localStorage.clear(), because
 * this product must not delete browser data belonging to another application.
 */
export function clearInterviewArchitectStorage(override?: StorageLike): StorageClearResult {
  const storage = browserStorage(override);
  if (!storage) return { ok: false, removedKeys: [], failedKeys: [], reason: "unavailable" };

  const keys: string[] = [];
  try {
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (key?.startsWith(STUDY_STORAGE_PREFIX)) keys.push(key);
    }
  } catch {
    return { ok: false, removedKeys: [], failedKeys: [], reason: "unavailable" };
  }

  const removedKeys: string[] = [];
  const failedKeys: string[] = [];
  for (const key of keys) {
    const removed = safeRemove(storage, key);
    if (removed.ok) removedKeys.push(key);
    else failedKeys.push(key);
  }
  return failedKeys.length
    ? { ok: false, removedKeys, failedKeys, reason: "partial" }
    : { ok: true, removedKeys, failedKeys };
}
