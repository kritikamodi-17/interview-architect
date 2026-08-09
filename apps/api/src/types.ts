import type {
  AttemptStatus,
  InterviewQuestion,
  PracticeMode,
  PracticeAttempt,
  TopicMastery
} from "@interview-architect/domain";

export interface WorkerBindings {
  DB?: D1Database;
  /** The public application origin, for example https://interview-architect.pages.dev. */
  ALLOWED_ORIGIN?: string;
  /** Set to production in the deployed Worker environment. */
  ENVIRONMENT?: string;
}

export interface AnonymousUser {
  id: string;
  createdAt: string;
}

export interface SessionRecord {
  id: string;
  userId: string;
  tokenHash: string;
  createdAt: string;
  expiresAt: string;
}

export interface AuthenticatedSession {
  user: AnonymousUser;
  session: SessionRecord;
}

export interface AppVariables {
  auth: AuthenticatedSession;
}

export interface CreateAttemptInput {
  id: string;
  userId: string;
  questionId: string;
  questionVersion: number;
  mode: PracticeMode;
  startedAt: string;
}

/**
 * The start-attempt endpoint is idempotent for an unfinished question. A retry
 * can therefore resume the original attempt instead of creating another row.
 */
export interface StartAttemptResult {
  attempt: PracticeAttempt;
  created: boolean;
}

export interface UpdateAttemptInput {
  status: Exclude<AttemptStatus, "in_progress">;
  completedAt: string;
  durationSeconds?: number;
  selfScore?: number;
  rubricScores?: Record<string, number>;
}

/** The stable response returned for a completed-attempt mutation. */
export interface AttemptCompletionResponse {
  attempt: PracticeAttempt;
  mastery?: TopicMastery;
}

/**
 * A completion is keyed by a client-generated operation ID. The request hash
 * binds that key to the exact normalized payload so a changed retry is safe to
 * reject instead of silently accepting a different review.
 */
export interface CompleteAttemptWithReceiptInput {
  userId: string;
  attemptId: string;
  update: UpdateAttemptInput & { status: "completed"; selfScore: number };
  operationKey: string;
  requestHash: string;
  response?: AttemptCompletionResponse;
  receiptCreatedAt: string;
  receiptExpiresAt: string;
}

export type CompleteAttemptWithReceiptResult =
  | { outcome: "completed"; response: AttemptCompletionResponse }
  | { outcome: "replayed"; response: AttemptCompletionResponse }
  | { outcome: "idempotency_key_reused" }
  | { outcome: "attempt_already_finished" };

export interface ReviewQueueItem {
  question: InterviewQuestion;
  mastery: TopicMastery;
}

export interface ProgressSummary {
  completedAttempts: number;
  bookmarkedQuestions: number;
  reviewDue: number;
  topicsPracticed: number;
}

export interface ProgressResponse {
  attempts: PracticeAttempt[];
  bookmarks: string[];
  mastery: TopicMastery[];
  summary: ProgressSummary;
}
