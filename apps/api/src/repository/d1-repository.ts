import type { AttemptStatus, PracticeAttempt, TopicMastery } from "@interview-architect/domain";
import type {
  AnonymousUser,
  CreateAttemptInput,
  SessionRecord,
  StartAttemptResult,
  UpdateAttemptInput
} from "../types";
import type { CreateAnonymousSessionInput, LearnerRepository } from "./repository";

interface SessionRow {
  session_id: string;
  user_id: string;
  token_hash: string;
  session_created_at: string;
  expires_at: string;
  user_created_at: string;
}

interface AttemptRow {
  id: string;
  user_id: string;
  question_id: string;
  question_version: number;
  status: AttemptStatus;
  started_at: string;
  completed_at: string | null;
  duration_seconds: number | null;
  self_score: number | null;
}

interface RubricScoreRow {
  attempt_id: string;
  dimension: string;
  score: number;
}

interface MasteryRow {
  user_id: string;
  topic_id: string;
  mastery_score: number;
  confidence: number;
  attempts_count: number;
  last_practiced_at: string | null;
  next_review_at: string | null;
}

function toAttempt(row: AttemptRow, scoreRows: RubricScoreRow[] = []): PracticeAttempt {
  const rubricScores = scoreRows
    .filter((score) => score.attempt_id === row.id)
    .reduce<Record<string, number>>((scores, score) => {
      scores[score.dimension] = score.score;
      return scores;
    }, {});

  return {
    id: row.id,
    userId: row.user_id,
    questionId: row.question_id,
    questionVersion: row.question_version,
    status: row.status,
    startedAt: row.started_at,
    ...(row.completed_at === null ? {} : { completedAt: row.completed_at }),
    ...(row.duration_seconds === null ? {} : { durationSeconds: row.duration_seconds }),
    ...(row.self_score === null ? {} : { selfScore: row.self_score }),
    ...(Object.keys(rubricScores).length === 0 ? {} : { rubricScores })
  };
}

function toMastery(row: MasteryRow): TopicMastery {
  return {
    userId: row.user_id,
    topicId: row.topic_id,
    masteryScore: row.mastery_score,
    confidence: row.confidence,
    attemptsCount: row.attempts_count,
    ...(row.last_practiced_at === null ? {} : { lastPracticedAt: row.last_practiced_at }),
    ...(row.next_review_at === null ? {} : { nextReviewAt: row.next_review_at })
  };
}

/** Cloudflare D1 implementation. Every user-controlled value is bound as a query parameter. */
export class D1LearnerRepository implements LearnerRepository {
  constructor(private readonly db: D1Database) {}

  async createAnonymousSession(input: CreateAnonymousSessionInput): Promise<void> {
    await this.db.batch([
      this.db
        .prepare(
          `INSERT INTO anonymous_users (id, created_at)
           VALUES (?, ?)`
        )
        .bind(input.user.id, input.user.createdAt),
      this.db
        .prepare(
          `INSERT INTO sessions (id, user_id, token_hash, created_at, expires_at)
           VALUES (?, ?, ?, ?, ?)`
        )
        .bind(
          input.session.id,
          input.session.userId,
          input.session.tokenHash,
          input.session.createdAt,
          input.session.expiresAt
        )
    ]);
  }

  async purgeExpiredSessions(now: string): Promise<void> {
    // These statements share a D1 transaction. Explicit child deletes keep the
    // retention path safe even if an older deployment has foreign keys disabled.
    await this.db.batch([
      this.db.prepare(`DELETE FROM sessions WHERE expires_at <= ?`).bind(now),
      this.db.prepare(
        `DELETE FROM attempt_rubric_scores
         WHERE attempt_id IN (
           SELECT attempts.id
           FROM practice_attempts attempts
           WHERE NOT EXISTS (
             SELECT 1 FROM sessions WHERE sessions.user_id = attempts.user_id
           )
         )`
      ),
      this.db.prepare(
        `DELETE FROM bookmarks
         WHERE NOT EXISTS (
           SELECT 1 FROM sessions WHERE sessions.user_id = bookmarks.user_id
         )`
      ),
      this.db.prepare(
        `DELETE FROM topic_mastery
         WHERE NOT EXISTS (
           SELECT 1 FROM sessions WHERE sessions.user_id = topic_mastery.user_id
         )`
      ),
      this.db.prepare(
        `DELETE FROM practice_attempts
         WHERE NOT EXISTS (
           SELECT 1 FROM sessions WHERE sessions.user_id = practice_attempts.user_id
         )`
      ),
      this.db.prepare(
        `DELETE FROM anonymous_users
         WHERE NOT EXISTS (
           SELECT 1 FROM sessions WHERE sessions.user_id = anonymous_users.id
         )`
      )
    ]);
  }

  async findAuthenticatedSession(
    tokenHash: string,
    now: string
  ): Promise<{ user: AnonymousUser; session: SessionRecord } | undefined> {
    const row = await this.db
      .prepare(
        `SELECT s.id AS session_id, s.user_id, s.token_hash,
                s.created_at AS session_created_at, s.expires_at,
                u.created_at AS user_created_at
         FROM sessions s
         INNER JOIN anonymous_users u ON u.id = s.user_id
         WHERE s.token_hash = ? AND s.expires_at > ?
         LIMIT 1`
      )
      .bind(tokenHash, now)
      .first<SessionRow>();

    if (!row) return undefined;

    return {
      user: { id: row.user_id, createdAt: row.user_created_at },
      session: {
        id: row.session_id,
        userId: row.user_id,
        tokenHash: row.token_hash,
        createdAt: row.session_created_at,
        expiresAt: row.expires_at
      }
    };
  }

  async refreshSessionExpiry(tokenHash: string, expiresAt: string): Promise<void> {
    await this.db
      .prepare(`UPDATE sessions SET expires_at = ? WHERE token_hash = ?`)
      .bind(expiresAt, tokenHash)
      .run();
  }

  async getUser(userId: string): Promise<AnonymousUser | undefined> {
    const row = await this.db
      .prepare(`SELECT id, created_at FROM anonymous_users WHERE id = ? LIMIT 1`)
      .bind(userId)
      .first<{ id: string; created_at: string }>();
    return row ? { id: row.id, createdAt: row.created_at } : undefined;
  }

  async deleteUser(userId: string): Promise<void> {
    // Explicit child deletes make the erasure path work even if a deployment
    // has not enabled SQLite foreign-key enforcement. The final user delete is
    // retained for schemas where cascading foreign keys are active.
    await this.db.batch([
      this.db
        .prepare(
          `DELETE FROM attempt_rubric_scores
           WHERE attempt_id IN (
             SELECT id FROM practice_attempts WHERE user_id = ?
           )`
        )
        .bind(userId),
      this.db.prepare(`DELETE FROM bookmarks WHERE user_id = ?`).bind(userId),
      this.db.prepare(`DELETE FROM topic_mastery WHERE user_id = ?`).bind(userId),
      this.db.prepare(`DELETE FROM practice_attempts WHERE user_id = ?`).bind(userId),
      this.db.prepare(`DELETE FROM sessions WHERE user_id = ?`).bind(userId),
      this.db.prepare(`DELETE FROM anonymous_users WHERE id = ?`).bind(userId)
    ]);
  }

  async listAttempts(userId: string): Promise<PracticeAttempt[]> {
    const result = await this.db
      .prepare(
        `SELECT id, user_id, question_id, question_version, status, started_at,
                completed_at, duration_seconds, self_score
         FROM practice_attempts
         WHERE user_id = ?
         ORDER BY started_at ASC, id ASC`
      )
      .bind(userId)
      .all<AttemptRow>();
    const attempts = result.results ?? [];
    const scoreRows = await this.findRubricScoresForUser(userId);
    return attempts.map((attempt) => toAttempt(attempt, scoreRows));
  }

  async getAttempt(userId: string, attemptId: string): Promise<PracticeAttempt | undefined> {
    const row = await this.db
      .prepare(
        `SELECT id, user_id, question_id, question_version, status, started_at,
                completed_at, duration_seconds, self_score
         FROM practice_attempts
         WHERE id = ? AND user_id = ?
         LIMIT 1`
      )
      .bind(attemptId, userId)
      .first<AttemptRow>();
    if (!row) return undefined;
    return toAttempt(row, await this.findRubricScoresForAttempt(attemptId));
  }

  async findOrCreateInProgressAttempt(input: CreateAttemptInput): Promise<StartAttemptResult> {
    // The partial unique index installed in migration 0004 makes the INSERT
    // the concurrency boundary: SQLite/D1 permits at most one unfinished row
    // for a learner and question. D1 executes the INSERT and SELECT below as
    // one transaction, so a conflicting attempt cannot complete between the
    // failed insert and the lookup of the attempt that won the race.
    const results = await this.db.batch<AttemptRow>([
      this.db
        .prepare(
          `INSERT INTO practice_attempts
             (id, user_id, question_id, question_version, status, started_at)
           VALUES (?, ?, ?, ?, 'in_progress', ?)
           ON CONFLICT(user_id, question_id) WHERE status = 'in_progress' DO NOTHING`
        )
        .bind(input.id, input.userId, input.questionId, input.questionVersion, input.startedAt),
      this.db
        .prepare(
          `SELECT id, user_id, question_id, question_version, status, started_at,
                  completed_at, duration_seconds, self_score
           FROM practice_attempts
           WHERE user_id = ? AND question_id = ? AND status = 'in_progress'
           LIMIT 1`
        )
        .bind(input.userId, input.questionId)
    ]);
    const inserted = results[0];
    const winner = results[1]?.results[0];
    if (!inserted || !winner) {
      throw new Error("Could not establish an in-progress attempt.");
    }

    return { attempt: toAttempt(winner), created: inserted.meta.changes > 0 };
  }

  async updateAttempt(
    userId: string,
    attemptId: string,
    input: UpdateAttemptInput
  ): Promise<PracticeAttempt | undefined> {
    // D1 batches are transactional. Score mutations intentionally happen
    // before the status update, so their guard can still require an in-progress
    // attempt; a batch failure rolls back both the scores and completion.
    const statements: D1PreparedStatement[] = [
      this.db
        .prepare(
          `DELETE FROM attempt_rubric_scores
           WHERE attempt_id = ?
             AND EXISTS (
               SELECT 1 FROM practice_attempts
               WHERE id = ? AND user_id = ? AND status = 'in_progress'
             )`
        )
        .bind(attemptId, attemptId, userId)
    ];
    for (const [dimension, score] of Object.entries(input.rubricScores ?? {})) {
      statements.push(
        this.db
          .prepare(
            `INSERT INTO attempt_rubric_scores (attempt_id, dimension, score)
             SELECT ?, ?, ?
             WHERE EXISTS (
               SELECT 1 FROM practice_attempts
               WHERE id = ? AND user_id = ? AND status = 'in_progress'
             )`
          )
          .bind(attemptId, dimension, score, attemptId, userId)
      );
    }

    statements.push(
      this.db
        .prepare(
          `UPDATE practice_attempts
           SET status = ?, completed_at = ?, duration_seconds = ?, self_score = ?
           WHERE id = ? AND user_id = ? AND status = 'in_progress'`
        )
        .bind(
          input.status,
          input.completedAt,
          input.durationSeconds ?? null,
          input.selfScore ?? null,
          attemptId,
          userId
        )
    );

    const results = await this.db.batch(statements);
    const update = results.at(-1);
    if (!update?.meta.changes) return undefined;

    return this.getAttempt(userId, attemptId);
  }

  async listBookmarks(userId: string): Promise<string[]> {
    const result = await this.db
      .prepare(
        `SELECT question_id
         FROM bookmarks
         WHERE user_id = ?
         ORDER BY created_at DESC, question_id ASC`
      )
      .bind(userId)
      .all<{ question_id: string }>();
    return (result.results ?? []).map((row) => row.question_id);
  }

  async setBookmark(
    userId: string,
    questionId: string,
    bookmarked: boolean,
    changedAt: string
  ): Promise<void> {
    if (bookmarked) {
      await this.db
        .prepare(
          `INSERT INTO bookmarks (user_id, question_id, created_at)
           VALUES (?, ?, ?)
           ON CONFLICT(user_id, question_id) DO NOTHING`
        )
        .bind(userId, questionId, changedAt)
        .run();
      return;
    }

    await this.db
      .prepare(`DELETE FROM bookmarks WHERE user_id = ? AND question_id = ?`)
      .bind(userId, questionId)
      .run();
  }

  async listMastery(userId: string): Promise<TopicMastery[]> {
    const result = await this.db
      .prepare(
        `SELECT user_id, topic_id, mastery_score, confidence, attempts_count,
                last_practiced_at, next_review_at
         FROM topic_mastery
         WHERE user_id = ?
         ORDER BY topic_id ASC`
      )
      .bind(userId)
      .all<MasteryRow>();
    return (result.results ?? []).map(toMastery);
  }

  async upsertMastery(mastery: TopicMastery): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO topic_mastery
           (user_id, topic_id, mastery_score, confidence, attempts_count,
            last_practiced_at, next_review_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(user_id, topic_id) DO UPDATE SET
           mastery_score = excluded.mastery_score,
           confidence = excluded.confidence,
           attempts_count = excluded.attempts_count,
           last_practiced_at = excluded.last_practiced_at,
           next_review_at = excluded.next_review_at,
           updated_at = excluded.updated_at`
      )
      .bind(
        mastery.userId,
        mastery.topicId,
        mastery.masteryScore,
        mastery.confidence,
        mastery.attemptsCount,
        mastery.lastPracticedAt ?? null,
        mastery.nextReviewAt ?? null,
        mastery.lastPracticedAt ?? new Date().toISOString()
      )
      .run();
  }

  private async findRubricScoresForUser(userId: string): Promise<RubricScoreRow[]> {
    const result = await this.db
      .prepare(
        `SELECT attempt_id, dimension, score
         FROM attempt_rubric_scores scores
         INNER JOIN practice_attempts attempts ON attempts.id = scores.attempt_id
         WHERE attempts.user_id = ?`
      )
      .bind(userId)
      .all<RubricScoreRow>();
    return result.results ?? [];
  }

  private async findRubricScoresForAttempt(attemptId: string): Promise<RubricScoreRow[]> {
    const result = await this.db
      .prepare(
        `SELECT attempt_id, dimension, score
         FROM attempt_rubric_scores
         WHERE attempt_id = ?`
      )
      .bind(attemptId)
      .all<RubricScoreRow>();
    return result.results ?? [];
  }
}
