import type {
  AttemptStatus,
  InterviewQuestion,
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
