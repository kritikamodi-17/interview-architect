import type {
  AttemptStatus,
  PracticeAttempt,
  PracticeMode,
  TopicMastery
} from "@interview-architect/domain";
import type {
  AttemptCompletionResponse,
  CompletionMasteryContext,
  CompleteAttemptWithReceiptInput,
  CompleteAttemptWithReceiptResult,
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
  mode: PracticeMode;
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

interface CompletionReceiptRow {
  request_hash: string;
  response_json: string;
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
    mode: row.mode,
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

function copyCompletionResponse(response: AttemptCompletionResponse): AttemptCompletionResponse {
  return {
    attempt: {
      ...response.attempt,
      ...(response.attempt.rubricScores ? { rubricScores: { ...response.attempt.rubricScores } } : {})
    },
    ...(response.mastery ? { mastery: { ...response.mastery } } : {})
  };
}

function parseCompletionResponse(serialized: string): AttemptCompletionResponse {
  const parsed: unknown = JSON.parse(serialized);
  if (
    !parsed ||
    typeof parsed !== "object" ||
    !("attempt" in parsed) ||
    !parsed.attempt ||
    typeof parsed.attempt !== "object"
  ) {
    throw new Error("Stored completion receipt is invalid.");
  }
  return copyCompletionResponse(parsed as AttemptCompletionResponse);
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
      // Keep receipt maintenance bounded. The expiry index avoids a table scan,
      // while the row cap keeps routine authenticated reads from turning into a
      // large cleanup job.
      this.db
        .prepare(
          `DELETE FROM mutation_receipts
           WHERE rowid IN (
             SELECT rowid FROM mutation_receipts
             WHERE expires_at <= ?
             ORDER BY expires_at ASC
             LIMIT 100
           )`
        )
        .bind(now),
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
        `DELETE FROM mutation_receipts
         WHERE NOT EXISTS (
           SELECT 1 FROM sessions WHERE sessions.user_id = mutation_receipts.user_id
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
      this.db.prepare(`DELETE FROM mutation_receipts WHERE user_id = ?`).bind(userId),
      this.db.prepare(`DELETE FROM practice_attempts WHERE user_id = ?`).bind(userId),
      this.db.prepare(`DELETE FROM sessions WHERE user_id = ?`).bind(userId),
      this.db.prepare(`DELETE FROM anonymous_users WHERE id = ?`).bind(userId)
    ]);
  }

  async listAttempts(userId: string): Promise<PracticeAttempt[]> {
    const result = await this.db
      .prepare(
        `SELECT id, user_id, question_id, question_version, mode, status, started_at,
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
        `SELECT id, user_id, question_id, question_version, mode, status, started_at,
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
             (id, user_id, question_id, question_version, mode, status, started_at)
           VALUES (?, ?, ?, ?, ?, 'in_progress', ?)
           ON CONFLICT(user_id, question_id) WHERE status = 'in_progress' DO NOTHING`
        )
        .bind(
          input.id,
          input.userId,
          input.questionId,
          input.questionVersion,
          input.mode,
          input.startedAt
        ),
      this.db
        .prepare(
          `SELECT id, user_id, question_id, question_version, mode, status, started_at,
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

  async completeAttemptWithReceipt(
    input: CompleteAttemptWithReceiptInput
  ): Promise<CompleteAttemptWithReceiptResult> {
    const existing = await this.findCompletionReceipt(input.userId, input.operationKey);
    if (existing) {
      return existing.requestHash === input.requestHash
        ? { outcome: "replayed", response: existing.response }
        : { outcome: "idempotency_key_reused" };
    }
    if (!input.response) return { outcome: "attempt_already_finished" };
    if (input.masteryContext) {
      return this.completeAttemptWithCalculatedMastery(input as CompleteAttemptWithReceiptInput & {
        response: AttemptCompletionResponse;
        masteryContext: CompletionMasteryContext;
      });
    }

    const response = copyCompletionResponse(input.response);
    const guardValues = [
      input.attemptId,
      input.userId,
      input.userId,
      input.operationKey,
      input.attemptId,
      input.requestHash
    ];
    const attemptAndReceiptGuard = `
      EXISTS (
        SELECT 1 FROM practice_attempts
        WHERE id = ? AND user_id = ? AND status = 'in_progress'
      )
      AND EXISTS (
        SELECT 1 FROM mutation_receipts
        WHERE user_id = ? AND operation_key = ? AND attempt_id = ? AND request_hash = ?
      )`;
    const statements: D1PreparedStatement[] = [
      // The receipt is written first but only while the attempt is unfinished.
      // The remaining statements are all gated by that receipt, which keeps the
      // completion, rubric replacement, mastery update, and response receipt in
      // one D1 transaction.
      this.db
        .prepare(
          `INSERT INTO mutation_receipts
             (user_id, operation_key, attempt_id, request_hash, response_json, http_status, created_at, expires_at)
           SELECT ?, ?, ?, ?, ?, 200, ?, ?
           WHERE EXISTS (
             SELECT 1 FROM practice_attempts
             WHERE id = ? AND user_id = ? AND status = 'in_progress'
           )
           ON CONFLICT(user_id, operation_key) DO NOTHING`
        )
        .bind(
          input.userId,
          input.operationKey,
          input.attemptId,
          input.requestHash,
          JSON.stringify(response),
          input.receiptCreatedAt,
          input.receiptExpiresAt,
          input.attemptId,
          input.userId
        ),
      this.db
        .prepare(
          `DELETE FROM attempt_rubric_scores
           WHERE attempt_id = ? AND ${attemptAndReceiptGuard}`
        )
        .bind(input.attemptId, ...guardValues)
    ];

    for (const [dimension, score] of Object.entries(input.update.rubricScores ?? {})) {
      statements.push(
        this.db
          .prepare(
            `INSERT INTO attempt_rubric_scores (attempt_id, dimension, score)
             SELECT ?, ?, ?
             WHERE ${attemptAndReceiptGuard}`
          )
          .bind(input.attemptId, dimension, score, ...guardValues)
      );
    }

    if (response.mastery) {
      const mastery = response.mastery;
      statements.push(
        this.db
          .prepare(
            `INSERT INTO topic_mastery
               (user_id, topic_id, mastery_score, confidence, attempts_count,
                last_practiced_at, next_review_at, updated_at)
             SELECT ?, ?, ?, ?, ?, ?, ?, ?
             WHERE ${attemptAndReceiptGuard}
             ON CONFLICT(user_id, topic_id) DO UPDATE SET
               mastery_score = excluded.mastery_score,
               confidence = excluded.confidence,
               attempts_count = excluded.attempts_count,
               last_practiced_at = excluded.last_practiced_at,
               next_review_at = excluded.next_review_at,
               updated_at = excluded.updated_at`
          )
          .bind(
            input.userId,
            mastery.topicId,
            mastery.masteryScore,
            mastery.confidence,
            mastery.attemptsCount,
            mastery.lastPracticedAt ?? null,
            mastery.nextReviewAt ?? null,
            mastery.lastPracticedAt ?? input.receiptCreatedAt,
            ...guardValues
          )
      );
    }

    statements.push(
      this.db
        .prepare(
          `UPDATE practice_attempts
           SET status = 'completed', completed_at = ?, duration_seconds = ?, self_score = ?
           WHERE id = ? AND user_id = ? AND status = 'in_progress'
             AND EXISTS (
               SELECT 1 FROM mutation_receipts
               WHERE user_id = ? AND operation_key = ? AND attempt_id = ? AND request_hash = ?
             )`
        )
        .bind(
          input.update.completedAt,
          input.update.durationSeconds ?? null,
          input.update.selfScore,
          input.attemptId,
          input.userId,
          input.userId,
          input.operationKey,
          input.attemptId,
          input.requestHash
        )
    );

    try {
      const results = await this.db.batch(statements);
      const receiptCreated = results[0]?.meta.changes ?? 0;
      const attemptCompleted = results.at(-1)?.meta.changes ?? 0;
      if (receiptCreated > 0 && attemptCompleted > 0) {
        return { outcome: "completed", response };
      }
    } catch (error) {
      // Concurrent identical requests can race on the receipt key. If the
      // transaction that won the race committed, return its immutable result.
      const racedReceipt = await this.findCompletionReceipt(input.userId, input.operationKey);
      if (racedReceipt) {
        return racedReceipt.requestHash === input.requestHash
          ? { outcome: "replayed", response: racedReceipt.response }
          : { outcome: "idempotency_key_reused" };
      }
      throw error;
    }

    const racedReceipt = await this.findCompletionReceipt(input.userId, input.operationKey);
    if (racedReceipt) {
      return racedReceipt.requestHash === input.requestHash
        ? { outcome: "replayed", response: racedReceipt.response }
        : { outcome: "idempotency_key_reused" };
    }
    return { outcome: "attempt_already_finished" };
  }

  /**
   * Compute one topic's aggregate after the attempt update inside the same D1
   * batch. This prevents two concurrent completions from both writing an
   * attempts_count of one based on a stale pre-transaction read.
   */
  private async completeAttemptWithCalculatedMastery(
    input: CompleteAttemptWithReceiptInput & {
      response: AttemptCompletionResponse;
      masteryContext: CompletionMasteryContext;
    }
  ): Promise<CompleteAttemptWithReceiptResult> {
    const guardValues = [
      input.attemptId,
      input.userId,
      input.userId,
      input.operationKey,
      input.attemptId,
      input.requestHash
    ];
    const receiptGuard = `
      EXISTS (
        SELECT 1 FROM mutation_receipts
        WHERE user_id = ? AND operation_key = ? AND attempt_id = ? AND request_hash = ?
          AND response_json = '{"pending":true}'
      )`;
    const attemptAndReceiptGuard = `
      EXISTS (
        SELECT 1 FROM practice_attempts
        WHERE id = ? AND user_id = ? AND status = 'in_progress'
      )
      AND ${receiptGuard}`;
    const statements: D1PreparedStatement[] = [
      // Reserve the immutable operation key before changing data. The final
      // receipt response is populated later in this same transaction from the
      // database-visible attempt and topic mastery state.
      this.db
        .prepare(
          `INSERT INTO mutation_receipts
             (user_id, operation_key, attempt_id, request_hash, response_json, http_status, created_at, expires_at)
           SELECT ?, ?, ?, ?, '{"pending":true}', 200, ?, ?
           WHERE EXISTS (
             SELECT 1 FROM practice_attempts
             WHERE id = ? AND user_id = ? AND status = 'in_progress'
           )
           ON CONFLICT(user_id, operation_key) DO NOTHING`
        )
        .bind(
          input.userId,
          input.operationKey,
          input.attemptId,
          input.requestHash,
          input.receiptCreatedAt,
          input.receiptExpiresAt,
          input.attemptId,
          input.userId
        ),
      this.db
        .prepare(
          `DELETE FROM attempt_rubric_scores
           WHERE attempt_id = ? AND ${attemptAndReceiptGuard}`
        )
        .bind(input.attemptId, ...guardValues)
    ];

    for (const [dimension, score] of Object.entries(input.update.rubricScores ?? {})) {
      statements.push(
        this.db
          .prepare(
            `INSERT INTO attempt_rubric_scores (attempt_id, dimension, score)
             SELECT ?, ?, ?
             WHERE ${attemptAndReceiptGuard}`
          )
          .bind(input.attemptId, dimension, score, ...guardValues)
      );
    }

    statements.push(
      this.db
        .prepare(
          `UPDATE practice_attempts
           SET status = 'completed', completed_at = ?, duration_seconds = ?, self_score = ?
           WHERE id = ? AND user_id = ? AND status = 'in_progress'
             AND ${receiptGuard}`
        )
        .bind(
          input.update.completedAt,
          input.update.durationSeconds ?? null,
          input.update.selfScore,
          input.attemptId,
          input.userId,
          input.userId,
          input.operationKey,
          input.attemptId,
          input.requestHash
        )
    );
    const attemptStatementIndex = statements.length - 1;

    const topicQuestionIds = [...new Set(input.masteryContext.questionIds)];
    if (!topicQuestionIds.length) return { outcome: "attempt_already_finished" };
    const topicPlaceholders = topicQuestionIds.map(() => "?").join(", ");
    statements.push(
      this.db
        .prepare(
          `WITH relevant AS (
             SELECT id, self_score, completed_at, started_at,
                    ROW_NUMBER() OVER (ORDER BY completed_at ASC, started_at ASC, id ASC) - 1 AS completion_index,
                    COUNT(*) OVER () AS total_count
             FROM practice_attempts
             WHERE user_id = ?
               AND status = 'completed'
               AND self_score IS NOT NULL
               AND question_id IN (${topicPlaceholders})
           ),
           aggregate AS (
             SELECT
               CAST(ROUND(MIN(100.0, SUM(self_score * (total_count + completion_index)) * 25.0 / SUM(total_count + completion_index))) AS INTEGER) AS mastery_score,
               COUNT(*) AS attempts_count
             FROM relevant
           ),
           latest AS (
             SELECT self_score, completed_at
             FROM relevant
             ORDER BY completed_at DESC, started_at DESC, id DESC
             LIMIT 1
           )
           INSERT INTO topic_mastery
             (user_id, topic_id, mastery_score, confidence, attempts_count,
              last_practiced_at, next_review_at, updated_at)
           SELECT ?, ?, aggregate.mastery_score, latest.self_score, aggregate.attempts_count,
                  latest.completed_at,
                  strftime('%Y-%m-%dT%H:%M:%fZ', datetime(
                    latest.completed_at,
                    '+' || CASE latest.self_score
                      WHEN 0 THEN 1 WHEN 1 THEN 2 WHEN 2 THEN 4 WHEN 3 THEN 8 ELSE 14
                    END || ' days'
                  )),
                  ?
           FROM aggregate
           CROSS JOIN latest
           WHERE ${receiptGuard}
           ON CONFLICT(user_id, topic_id) DO UPDATE SET
             mastery_score = excluded.mastery_score,
             confidence = excluded.confidence,
             attempts_count = excluded.attempts_count,
             last_practiced_at = excluded.last_practiced_at,
             next_review_at = excluded.next_review_at,
             updated_at = excluded.updated_at`
        )
        .bind(
          input.userId,
          ...topicQuestionIds,
          input.userId,
          input.masteryContext.topicId,
          input.receiptCreatedAt,
          input.userId,
          input.operationKey,
          input.attemptId,
          input.requestHash
        )
    );

    statements.push(
      this.db
        .prepare(
          `UPDATE mutation_receipts
           SET response_json = (
             SELECT json_object(
               'attempt', json_object(
                 'id', attempts.id,
                 'userId', attempts.user_id,
                 'questionId', attempts.question_id,
                 'questionVersion', attempts.question_version,
                 'mode', attempts.mode,
                 'status', attempts.status,
                 'startedAt', attempts.started_at,
                 'completedAt', attempts.completed_at,
                 'durationSeconds', attempts.duration_seconds,
                 'selfScore', attempts.self_score,
                 'rubricScores', json(COALESCE((
                   SELECT json_group_object(dimension, score)
                   FROM attempt_rubric_scores
                   WHERE attempt_id = attempts.id
                 ), '{}'))
               ),
               'mastery', json_object(
                 'userId', mastery.user_id,
                 'topicId', mastery.topic_id,
                 'masteryScore', mastery.mastery_score,
                 'confidence', mastery.confidence,
                 'attemptsCount', mastery.attempts_count,
                 'lastPracticedAt', mastery.last_practiced_at,
                 'nextReviewAt', mastery.next_review_at
               )
             )
             FROM practice_attempts attempts
             INNER JOIN topic_mastery mastery
               ON mastery.user_id = attempts.user_id AND mastery.topic_id = ?
             WHERE attempts.id = ? AND attempts.user_id = ?
           )
           WHERE user_id = ? AND operation_key = ? AND attempt_id = ? AND request_hash = ?
             AND ${receiptGuard}`
        )
        .bind(
          input.masteryContext.topicId,
          input.attemptId,
          input.userId,
          input.userId,
          input.operationKey,
          input.attemptId,
          input.requestHash,
          input.userId,
          input.operationKey,
          input.attemptId,
          input.requestHash
        )
    );

    try {
      const results = await this.db.batch(statements);
      const receiptCreated = results[0]?.meta.changes ?? 0;
      const attemptCompleted = results[attemptStatementIndex]?.meta.changes ?? 0;
      if (receiptCreated > 0 && attemptCompleted > 0) {
        const receipt = await this.findCompletionReceipt(input.userId, input.operationKey);
        if (receipt && receipt.requestHash === input.requestHash) {
          return { outcome: "completed", response: receipt.response };
        }
      }
    } catch (error) {
      const racedReceipt = await this.findCompletionReceipt(input.userId, input.operationKey);
      if (racedReceipt) {
        return racedReceipt.requestHash === input.requestHash
          ? { outcome: "replayed", response: racedReceipt.response }
          : { outcome: "idempotency_key_reused" };
      }
      throw error;
    }

    const racedReceipt = await this.findCompletionReceipt(input.userId, input.operationKey);
    if (racedReceipt) {
      return racedReceipt.requestHash === input.requestHash
        ? { outcome: "replayed", response: racedReceipt.response }
        : { outcome: "idempotency_key_reused" };
    }
    return { outcome: "attempt_already_finished" };
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

  private async findCompletionReceipt(
    userId: string,
    operationKey: string
  ): Promise<{ requestHash: string; response: AttemptCompletionResponse } | undefined> {
    const row = await this.db
      .prepare(
        `SELECT request_hash, response_json
         FROM mutation_receipts
         WHERE user_id = ? AND operation_key = ?
         LIMIT 1`
      )
      .bind(userId, operationKey)
      .first<CompletionReceiptRow>();
    if (!row) return undefined;
    return { requestHash: row.request_hash, response: parseCompletionResponse(row.response_json) };
  }
}
