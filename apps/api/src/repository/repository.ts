import type { PracticeAttempt, TopicMastery } from "@interview-architect/domain";
import type {
  AnonymousUser,
  CreateAttemptInput,
  SessionRecord,
  StartAttemptResult,
  UpdateAttemptInput
} from "../types";

export interface CreateAnonymousSessionInput {
  user: AnonymousUser;
  session: SessionRecord;
}

/**
 * Persistence boundary for learner-owned state.
 *
 * Question bodies and answer drafts deliberately do not cross this boundary:
 * catalog content remains static and a learner's written response stays in the
 * browser.
 */
export interface LearnerRepository {
  createAnonymousSession(input: CreateAnonymousSessionInput): Promise<void>;
  /** Removes expired sessions and anonymous users that no longer have a session. */
  purgeExpiredSessions(now: string): Promise<void>;
  findAuthenticatedSession(tokenHash: string, now: string): Promise<
    | { user: AnonymousUser; session: SessionRecord }
    | undefined
  >;
  refreshSessionExpiry(tokenHash: string, expiresAt: string): Promise<void>;
  getUser(userId: string): Promise<AnonymousUser | undefined>;
  /** Erases all learner-owned state for an anonymous user. */
  deleteUser(userId: string): Promise<void>;

  listAttempts(userId: string): Promise<PracticeAttempt[]>;
  getAttempt(userId: string, attemptId: string): Promise<PracticeAttempt | undefined>;
  /**
   * Atomically creates an in-progress attempt or returns the learner's
   * existing in-progress attempt for the same question.
   */
  findOrCreateInProgressAttempt(input: CreateAttemptInput): Promise<StartAttemptResult>;
  updateAttempt(
    userId: string,
    attemptId: string,
    input: UpdateAttemptInput
  ): Promise<PracticeAttempt | undefined>;

  listBookmarks(userId: string): Promise<string[]>;
  setBookmark(
    userId: string,
    questionId: string,
    bookmarked: boolean,
    changedAt: string
  ): Promise<void>;

  listMastery(userId: string): Promise<TopicMastery[]>;
  upsertMastery(mastery: TopicMastery): Promise<void>;
}
