import type { PracticeAttempt, TopicMastery } from "@interview-architect/domain";
import type {
  AnonymousUser,
  CreateAttemptInput,
  SessionRecord,
  StartAttemptResult,
  UpdateAttemptInput
} from "../types";
import type { CreateAnonymousSessionInput, LearnerRepository } from "./repository";

function copyAttempt(attempt: PracticeAttempt): PracticeAttempt {
  return {
    ...attempt,
    ...(attempt.rubricScores ? { rubricScores: { ...attempt.rubricScores } } : {})
  };
}

function copyMastery(mastery: TopicMastery): TopicMastery {
  return { ...mastery };
}

/** A deterministic repository for API tests and local dependency injection. */
export class MemoryLearnerRepository implements LearnerRepository {
  private readonly users = new Map<string, AnonymousUser>();
  private readonly sessions = new Map<string, SessionRecord>();
  private readonly attempts = new Map<string, PracticeAttempt>();
  private readonly bookmarks = new Map<string, Set<string>>();
  private readonly mastery = new Map<string, TopicMastery>();

  async createAnonymousSession(input: CreateAnonymousSessionInput): Promise<void> {
    this.users.set(input.user.id, { ...input.user });
    this.sessions.set(input.session.tokenHash, { ...input.session });
  }

  async purgeExpiredSessions(now: string): Promise<void> {
    for (const [tokenHash, session] of this.sessions) {
      if (session.expiresAt <= now) this.sessions.delete(tokenHash);
    }

    const usersWithSessions = new Set([...this.sessions.values()].map((session) => session.userId));
    for (const userId of this.users.keys()) {
      if (!usersWithSessions.has(userId)) await this.deleteUser(userId);
    }
  }

  async findAuthenticatedSession(
    tokenHash: string,
    now: string
  ): Promise<{ user: AnonymousUser; session: SessionRecord } | undefined> {
    const session = this.sessions.get(tokenHash);
    if (!session || session.expiresAt <= now) return undefined;

    const user = this.users.get(session.userId);
    if (!user) return undefined;

    return { user: { ...user }, session: { ...session } };
  }

  async refreshSessionExpiry(tokenHash: string, expiresAt: string): Promise<void> {
    const session = this.sessions.get(tokenHash);
    if (session) this.sessions.set(tokenHash, { ...session, expiresAt });
  }

  async getUser(userId: string): Promise<AnonymousUser | undefined> {
    const user = this.users.get(userId);
    return user ? { ...user } : undefined;
  }

  async deleteUser(userId: string): Promise<void> {
    this.users.delete(userId);
    this.bookmarks.delete(userId);

    for (const [tokenHash, session] of this.sessions) {
      if (session.userId === userId) this.sessions.delete(tokenHash);
    }
    for (const [attemptId, attempt] of this.attempts) {
      if (attempt.userId === userId) this.attempts.delete(attemptId);
    }
    for (const [masteryKey, mastery] of this.mastery) {
      if (mastery.userId === userId) this.mastery.delete(masteryKey);
    }
  }

  async listAttempts(userId: string): Promise<PracticeAttempt[]> {
    return [...this.attempts.values()]
      .filter((attempt) => attempt.userId === userId)
      .sort((a, b) => a.startedAt.localeCompare(b.startedAt))
      .map(copyAttempt);
  }

  async getAttempt(userId: string, attemptId: string): Promise<PracticeAttempt | undefined> {
    const attempt = this.attempts.get(attemptId);
    return attempt?.userId === userId ? copyAttempt(attempt) : undefined;
  }

  async findOrCreateInProgressAttempt(input: CreateAttemptInput): Promise<StartAttemptResult> {
    const existing = [...this.attempts.values()].find(
      (attempt) =>
        attempt.userId === input.userId &&
        attempt.questionId === input.questionId &&
        attempt.status === "in_progress"
    );
    if (existing) return { attempt: copyAttempt(existing), created: false };

    const attempt: PracticeAttempt = {
      id: input.id,
      userId: input.userId,
      questionId: input.questionId,
      questionVersion: input.questionVersion,
      status: "in_progress",
      startedAt: input.startedAt
    };
    this.attempts.set(attempt.id, attempt);
    return { attempt: copyAttempt(attempt), created: true };
  }

  async updateAttempt(
    userId: string,
    attemptId: string,
    input: UpdateAttemptInput
  ): Promise<PracticeAttempt | undefined> {
    const current = this.attempts.get(attemptId);
    if (!current || current.userId !== userId || current.status !== "in_progress") return undefined;

    const updated: PracticeAttempt = {
      ...current,
      status: input.status,
      completedAt: input.completedAt,
      ...(input.durationSeconds === undefined ? {} : { durationSeconds: input.durationSeconds }),
      ...(input.selfScore === undefined ? {} : { selfScore: input.selfScore }),
      ...(input.rubricScores === undefined ? {} : { rubricScores: { ...input.rubricScores } })
    };
    this.attempts.set(attemptId, updated);
    return copyAttempt(updated);
  }

  async listBookmarks(userId: string): Promise<string[]> {
    return [...(this.bookmarks.get(userId) ?? new Set<string>())].sort();
  }

  async setBookmark(
    userId: string,
    questionId: string,
    bookmarked: boolean,
    _changedAt: string
  ): Promise<void> {
    const userBookmarks = this.bookmarks.get(userId) ?? new Set<string>();
    if (bookmarked) {
      userBookmarks.add(questionId);
      this.bookmarks.set(userId, userBookmarks);
      return;
    }

    userBookmarks.delete(questionId);
    if (userBookmarks.size === 0) {
      this.bookmarks.delete(userId);
    }
  }

  async listMastery(userId: string): Promise<TopicMastery[]> {
    return [...this.mastery.values()]
      .filter((item) => item.userId === userId)
      .sort((a, b) => a.topicId.localeCompare(b.topicId))
      .map(copyMastery);
  }

  async upsertMastery(mastery: TopicMastery): Promise<void> {
    this.mastery.set(`${mastery.userId}:${mastery.topicId}`, copyMastery(mastery));
  }
}
