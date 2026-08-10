import { describe, expect, it } from "vitest";
import { D1LearnerRepository } from "../src/repository/d1-repository";

interface StoredAttempt {
  id: string;
  user_id: string;
  question_id: string;
  question_version: number;
  mode: "learn" | "mock";
  status: "in_progress" | "completed" | "abandoned";
  started_at: string;
  completed_at: string | null;
  duration_seconds: number | null;
  self_score: number | null;
}

interface TestStatement {
  sql: string;
  values: unknown[];
}

/**
 * A narrow D1 double that models the old failure mode: a direct UPDATE mutates
 * immediately, while an injected batch failure makes no transactional changes.
 */
class AtomicityD1Double {
  private attempt: StoredAttempt = {
    id: "attempt-1",
    user_id: "user-1",
    question_id: "redis-cache-aside",
    question_version: 1,
    mode: "learn",
    status: "in_progress",
    started_at: "2026-08-09T12:00:00.000Z",
    completed_at: null,
    duration_seconds: null,
    self_score: null
  };
  private scores = new Map<string, number>([["read flow", 1]]);
  private receipts = new Map<string, { request_hash: string; response_json: string }>();
  failNextBatch = false;

  prepare(sql: string): D1PreparedStatement {
    return this.statement(sql, []);
  }

  async batch(statements: D1PreparedStatement[]) {
    if (this.failNextBatch) {
      this.failNextBatch = false;
      throw new Error("injected rubric write failure");
    }

    const nextAttempt = { ...this.attempt };
    const nextScores = new Map(this.scores);
    const nextReceipts = new Map(this.receipts);
    const results = (statements as unknown as TestStatement[]).map((statement) =>
      this.applyBatchStatement(statement, nextAttempt, nextScores, nextReceipts)
    );
    this.attempt = nextAttempt;
    this.scores = nextScores;
    this.receipts = nextReceipts;
    return results;
  }

  private statement(sql: string, values: unknown[]): D1PreparedStatement {
    return {
      sql,
      values,
      bind: (...boundValues: unknown[]) => this.statement(sql, boundValues),
      first: async () => this.first(sql, values),
      all: async () => this.result(this.all(sql, values)),
      run: async () => this.run(sql, values),
      raw: async () => []
    } as unknown as D1PreparedStatement;
  }

  private first(sql: string, values: unknown[]): unknown {
    const normalised = this.normalise(sql);
    if (normalised.includes("from mutation_receipts")) {
      const [userId, operationKey] = values;
      return this.receipts.get(`${userId}:${operationKey}`);
    }
    if (!normalised.includes("from practice_attempts")) return undefined;
    const [attemptId, userId] = values;
    if (attemptId !== this.attempt.id || userId !== this.attempt.user_id) return undefined;
    return { ...this.attempt };
  }

  private all(sql: string, values: unknown[]): Array<{ attempt_id: string; dimension: string; score: number }> {
    if (!this.normalise(sql).includes("from attempt_rubric_scores")) return [];
    if (values[0] !== this.attempt.id) return [];
    return [...this.scores.entries()].map(([dimension, score]) => ({
      attempt_id: this.attempt.id,
      dimension,
      score
    }));
  }

  private run(sql: string, values: unknown[]) {
    if (this.normalise(sql).startsWith("update practice_attempts")) {
      this.applyUpdate(this.attempt, values);
      return this.result([], 1);
    }
    return this.result();
  }

  private applyBatchStatement(
    statement: TestStatement,
    attempt: StoredAttempt,
    scores: Map<string, number>,
    receipts: Map<string, { request_hash: string; response_json: string }>
  ) {
    const sql = this.normalise(statement.sql);
    if (sql.startsWith("insert into mutation_receipts")) {
      const [userId, operationKey, attemptId, requestHash] = statement.values;
      const responseJson = sql.includes("'{\"pending\":true}'")
        ? '{"pending":true}'
        : String(statement.values[4]);
      const key = `${userId}:${operationKey}`;
      if (
        attempt.id === attemptId &&
        attempt.user_id === userId &&
        attempt.status === "in_progress" &&
        !receipts.has(key)
      ) {
        receipts.set(key, { request_hash: String(requestHash), response_json: responseJson });
        return this.result([], 1);
      }
      return this.result();
    }
    if (sql.startsWith("delete from attempt_rubric_scores")) {
      scores.clear();
      return this.result([], 1);
    }
    if (sql.startsWith("insert into attempt_rubric_scores")) {
      const [, dimension, score] = statement.values;
      scores.set(String(dimension), Number(score));
      return this.result([], 1);
    }
    if (sql.startsWith("insert into topic_mastery")) return this.result([], 1);
    if (sql.startsWith("update practice_attempts")) {
      this.applyUpdate(attempt, statement.values, sql);
      return this.result([], 1);
    }
    return this.result();
  }

  private applyUpdate(attempt: StoredAttempt, values: unknown[], sql = ""): void {
    if (sql.includes("set status = 'completed'")) {
      const [completedAt, durationSeconds, selfScore] = values;
      attempt.status = "completed";
      attempt.completed_at = completedAt as string;
      attempt.duration_seconds = durationSeconds as number | null;
      attempt.self_score = selfScore as number | null;
      return;
    }

    const [status, completedAt, durationSeconds, selfScore] = values;
    attempt.status = status as StoredAttempt["status"];
    attempt.completed_at = completedAt as string;
    attempt.duration_seconds = durationSeconds as number | null;
    attempt.self_score = selfScore as number | null;
  }

  private result(results: unknown[] = [], changes = 0) {
    return {
      success: true,
      results,
      meta: {
        changes,
        duration: 0,
        size_after: 0,
        rows_read: 0,
        rows_written: 0,
        last_row_id: 0,
        changed_db: changes > 0
      }
    };
  }

  private normalise(sql: string): string {
    return sql.replace(/\s+/g, " ").trim().toLowerCase();
  }
}

/**
 * A deliberately narrow D1 model for the calculated-mastery path. It applies
 * the new batch statements in order against cloned maps, which lets the test
 * prove both transaction rollback and the pending-receipt race guard without
 * pretending to be a general SQL implementation.
 */
class CalculatedMasteryD1Double {
  private attempts = new Map<string, StoredAttempt>([
    ["attempt-a", {
      id: "attempt-a", user_id: "user-1", question_id: "redis-cache-aside", question_version: 1,
      mode: "learn", status: "in_progress", started_at: "2026-08-09T12:00:00.000Z",
      completed_at: null, duration_seconds: null, self_score: null
    }],
    ["attempt-b", {
      id: "attempt-b", user_id: "user-1", question_id: "redis-invalidation", question_version: 1,
      mode: "mock", status: "in_progress", started_at: "2026-08-09T12:01:00.000Z",
      completed_at: null, duration_seconds: null, self_score: null
    }]
  ]);
  private scores = new Map<string, Map<string, number>>();
  private receipts = new Map<string, { request_hash: string; response_json: string }>();
  private mastery = new Map<string, { mastery_score: number; confidence: number; attempts_count: number; last_practiced_at: string; next_review_at: string }>();
  hideNextReceiptRead = false;
  failNextBatch = false;

  prepare(sql: string): D1PreparedStatement {
    return this.statement(sql, []);
  }

  async batch(statements: D1PreparedStatement[]) {
    if (this.failNextBatch) {
      this.failNextBatch = false;
      throw new Error("injected calculated-mastery batch failure");
    }
    const attempts = new Map([...this.attempts].map(([id, attempt]) => [id, { ...attempt }]));
    const scores = new Map([...this.scores].map(([id, entries]) => [id, new Map(entries)]));
    const receipts = new Map([...this.receipts].map(([key, receipt]) => [key, { ...receipt }]));
    const mastery = new Map([...this.mastery].map(([key, item]) => [key, { ...item }]));
    const results = (statements as unknown as TestStatement[]).map((statement) =>
      this.apply(statement, attempts, scores, receipts, mastery)
    );
    this.attempts = attempts;
    this.scores = scores;
    this.receipts = receipts;
    this.mastery = mastery;
    return results;
  }

  masteryFor(topicId: string) {
    return this.mastery.get(`user-1:${topicId}`);
  }

  receiptJson(operationKey: string): string | undefined {
    return this.receipts.get(`user-1:${operationKey}`)?.response_json;
  }

  private statement(sql: string, values: unknown[]): D1PreparedStatement {
    return {
      sql,
      values,
      bind: (...bound: unknown[]) => this.statement(sql, bound),
      first: async () => this.first(sql, values),
      all: async () => this.result(this.all(sql, values)),
      run: async () => this.result(),
      raw: async () => []
    } as unknown as D1PreparedStatement;
  }

  private first(sql: string, values: unknown[]): unknown {
    const normalized = this.normalise(sql);
    if (normalized.includes("from mutation_receipts")) {
      if (this.hideNextReceiptRead) {
        this.hideNextReceiptRead = false;
        return undefined;
      }
      const receipt = this.receipts.get(`${values[0]}:${values[1]}`);
      return receipt ? { ...receipt } : undefined;
    }
    if (normalized.includes("from practice_attempts")) {
      const attempt = this.attempts.get(String(values[0]));
      return attempt?.user_id === values[1] ? { ...attempt } : undefined;
    }
    return undefined;
  }

  private all(sql: string, values: unknown[]): Array<{ attempt_id: string; dimension: string; score: number }> {
    if (!this.normalise(sql).includes("from attempt_rubric_scores")) return [];
    const entries = this.scores.get(String(values[0])) ?? new Map<string, number>();
    return [...entries].map(([dimension, score]) => ({ attempt_id: String(values[0]), dimension, score }));
  }

  private apply(
    statement: TestStatement,
    attempts: Map<string, StoredAttempt>,
    scores: Map<string, Map<string, number>>,
    receipts: Map<string, { request_hash: string; response_json: string }>,
    mastery: Map<string, { mastery_score: number; confidence: number; attempts_count: number; last_practiced_at: string; next_review_at: string }>
  ) {
    const sql = this.normalise(statement.sql);
    const values = statement.values;
    if (sql.startsWith("insert into mutation_receipts")) {
      const [userId, operationKey, attemptId, requestHash] = values;
      const attempt = attempts.get(String(attemptId));
      const key = `${userId}:${operationKey}`;
      if (attempt && attempt.user_id === userId && attempt.status === "in_progress" && !receipts.has(key)) {
        receipts.set(key, { request_hash: String(requestHash), response_json: '{"pending":true}' });
        return this.result([], 1);
      }
      return this.result();
    }
    if (sql.startsWith("delete from attempt_rubric_scores")) {
      const attemptId = String(values[0]);
      if (this.canMutate(attempts, receipts, attemptId)) {
        scores.set(attemptId, new Map());
        return this.result([], 1);
      }
      return this.result();
    }
    if (sql.startsWith("insert into attempt_rubric_scores")) {
      const [attemptId, dimension, score] = values;
      if (this.canMutate(attempts, receipts, String(attemptId))) {
        const entries = scores.get(String(attemptId)) ?? new Map<string, number>();
        entries.set(String(dimension), Number(score));
        scores.set(String(attemptId), entries);
        return this.result([], 1);
      }
      return this.result();
    }
    if (sql.startsWith("update practice_attempts")) {
      const [completedAt, durationSeconds, selfScore, attemptId] = values;
      const attempt = attempts.get(String(attemptId));
      if (attempt && this.canMutate(attempts, receipts, String(attemptId))) {
        attempt.status = "completed";
        attempt.completed_at = String(completedAt);
        attempt.duration_seconds = durationSeconds as number | null;
        attempt.self_score = selfScore as number;
        return this.result([], 1);
      }
      return this.result();
    }
    if (sql.startsWith("with relevant as")) {
      const userId = String(values[0]);
      const targetUserIndex = values.length - 7;
      const questionIds = new Set(values.slice(1, targetUserIndex).map(String));
      const topicId = String(values[targetUserIndex + 1]);
      const operationKey = String(values[values.length - 3]);
      const attemptId = String(values[values.length - 2]);
      const receipt = receipts.get(`${userId}:${operationKey}`);
      if (!receipt || receipt.response_json !== '{"pending":true}' || receipt.request_hash !== values.at(-1) || !attempts.get(attemptId)) return this.result();
      const relevant = [...attempts.values()]
        .filter((attempt) => attempt.user_id === userId && questionIds.has(attempt.question_id) && attempt.status === "completed" && attempt.self_score !== null && attempt.completed_at)
        .sort((left, right) => `${left.completed_at}:${left.started_at}:${left.id}`.localeCompare(`${right.completed_at}:${right.started_at}:${right.id}`));
      if (!relevant.length) return this.result();
      const count = relevant.length;
      const weightedScore = relevant.reduce((sum, attempt, index) => sum + (attempt.self_score ?? 0) * (1 + index / count), 0);
      const weights = relevant.reduce((sum, _attempt, index) => sum + 1 + index / count, 0);
      const latest = relevant.at(-1)!;
      const days = [1, 2, 4, 8, 14][latest.self_score ?? 0] ?? 1;
      const nextReview = new Date(new Date(latest.completed_at!).getTime() + days * 24 * 60 * 60 * 1_000).toISOString();
      mastery.set(`${userId}:${topicId}`, {
        mastery_score: Math.round(Math.min(100, (weightedScore / weights) * 25)),
        confidence: latest.self_score ?? 0,
        attempts_count: count,
        last_practiced_at: latest.completed_at!,
        next_review_at: nextReview
      });
      return this.result([], 1);
    }
    if (sql.startsWith("update mutation_receipts")) {
      const [topicId, attemptId, userId, receiptUserId, operationKey] = values;
      const receipt = receipts.get(`${receiptUserId}:${operationKey}`);
      const attempt = attempts.get(String(attemptId));
      const topicMastery = mastery.get(`${userId}:${topicId}`);
      if (!receipt || receipt.response_json !== '{"pending":true}' || !attempt || !topicMastery) return this.result();
      const rubricScores = Object.fromEntries(scores.get(attempt.id) ?? []);
      receipt.response_json = JSON.stringify({
        attempt: {
          id: attempt.id,
          userId: attempt.user_id,
          questionId: attempt.question_id,
          questionVersion: attempt.question_version,
          mode: attempt.mode,
          status: attempt.status,
          startedAt: attempt.started_at,
          completedAt: attempt.completed_at,
          durationSeconds: attempt.duration_seconds,
          selfScore: attempt.self_score,
          rubricScores
        },
        mastery: {
          userId,
          topicId,
          masteryScore: topicMastery.mastery_score,
          confidence: topicMastery.confidence,
          attemptsCount: topicMastery.attempts_count,
          lastPracticedAt: topicMastery.last_practiced_at,
          nextReviewAt: topicMastery.next_review_at
        }
      });
      return this.result([], 1);
    }
    return this.result();
  }

  private canMutate(
    attempts: Map<string, StoredAttempt>,
    receipts: Map<string, { request_hash: string; response_json: string }>,
    attemptId: string
  ): boolean {
    const attempt = attempts.get(attemptId);
    return Boolean(attempt?.status === "in_progress" && [...receipts.values()].some((receipt) => receipt.response_json === '{"pending":true}'));
  }

  private result(results: unknown[] = [], changes = 0) {
    return { success: true, results, meta: { changes, duration: 0, size_after: 0, rows_read: 0, rows_written: 0, last_row_id: 0, changed_db: changes > 0 } };
  }

  private normalise(sql: string): string {
    return sql.replace(/\s+/g, " ").trim().toLowerCase();
  }
}

/**
 * Models the partial unique index introduced for idempotent attempt starts.
 * Each INSERT ... ON CONFLICT call is atomic, as it is in SQLite/D1.
 */
class IdempotentAttemptD1Double {
  private readonly attempts = new Map<string, StoredAttempt>();
  readonly statements: string[] = [];

  prepare(sql: string): D1PreparedStatement {
    this.statements.push(sql);
    return this.statement(sql, []);
  }

  async batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]> {
    return statements.map((statement) => {
      const { sql, values } = statement as unknown as TestStatement;
      if (this.normalise(sql).startsWith("insert into practice_attempts")) {
        return this.run(sql, values);
      }

      const row = this.first(sql, values);
      return this.result(row ? [row] : []);
    }) as D1Result<T>[];
  }

  inProgressAttemptIds(): string[] {
    return [...this.attempts.values()]
      .filter((attempt) => attempt.status === "in_progress")
      .map((attempt) => attempt.id)
      .sort();
  }

  private statement(sql: string, values: unknown[]): D1PreparedStatement {
    return {
      sql,
      values,
      bind: (...boundValues: unknown[]) => this.statement(sql, boundValues),
      first: async () => this.first(sql, values),
      all: async () => this.result(),
      run: async () => this.run(sql, values),
      raw: async () => []
    } as unknown as D1PreparedStatement;
  }

  private first(sql: string, values: unknown[]): StoredAttempt | undefined {
    const normalised = this.normalise(sql);
    if (!normalised.includes("where user_id = ? and question_id = ? and status = 'in_progress'")) {
      return undefined;
    }

    const [userId, questionId] = values;
    const attempt = [...this.attempts.values()].find(
      (candidate) =>
        candidate.user_id === userId &&
        candidate.question_id === questionId &&
        candidate.status === "in_progress"
    );
    return attempt ? { ...attempt } : undefined;
  }

  private run(sql: string, values: unknown[]) {
    if (!this.normalise(sql).startsWith("insert into practice_attempts")) return this.result();

    const [id, userId, questionId, questionVersion, mode, startedAt] = values;
    const existing = [...this.attempts.values()].find(
      (attempt) =>
        attempt.user_id === userId &&
        attempt.question_id === questionId &&
        attempt.status === "in_progress"
    );
    if (existing) {
      return this.result([], 0);
    }

    this.attempts.set(String(id), {
      id: String(id),
      user_id: String(userId),
      question_id: String(questionId),
      question_version: Number(questionVersion),
      mode: mode as "learn" | "mock",
      status: "in_progress",
      started_at: String(startedAt),
      completed_at: null,
      duration_seconds: null,
      self_score: null
    });
    return this.result([], 1);
  }

  private result(results: unknown[] = [], changes = 0) {
    return {
      success: true,
      results,
      meta: {
        changes,
        duration: 0,
        size_after: 0,
        rows_read: 0,
        rows_written: 0,
        last_row_id: 0,
        changed_db: changes > 0
      }
    };
  }

  private normalise(sql: string): string {
    return sql.replace(/\s+/g, " ").trim().toLowerCase();
  }
}

describe("D1LearnerRepository", () => {
  it("uses SQLite's partial unique index to make concurrent attempt starts idempotent", async () => {
    const database = new IdempotentAttemptD1Double();
    const repository = new D1LearnerRepository(database as unknown as D1Database);
    const input = {
      userId: "user-1",
      questionId: "redis-cache-aside",
      questionVersion: 1,
      mode: "mock" as const,
      startedAt: "2026-08-09T12:00:00.000Z"
    };

    const [first, retry] = await Promise.all([
      repository.findOrCreateInProgressAttempt({ ...input, id: "attempt-1" }),
      repository.findOrCreateInProgressAttempt({ ...input, id: "attempt-2" })
    ]);

    expect([first.created, retry.created].filter(Boolean)).toHaveLength(1);
    expect(first.attempt.id).toBe(retry.attempt.id);
    expect(first.attempt.mode).toBe("mock");
    expect(database.inProgressAttemptIds()).toEqual([first.attempt.id]);
    expect(database.statements.join(" ")).toContain(
      "ON CONFLICT(user_id, question_id) WHERE status = 'in_progress' DO NOTHING"
    );
  });

  it("does not leave an attempt completed if a rubric-score batch fails", async () => {
    const database = new AtomicityD1Double();
    const repository = new D1LearnerRepository(database as unknown as D1Database);
    database.failNextBatch = true;

    await expect(
      repository.updateAttempt("user-1", "attempt-1", {
        status: "completed",
        completedAt: "2026-08-09T12:30:00.000Z",
        durationSeconds: 1_800,
        selfScore: 3,
        rubricScores: { "read flow": 4 }
      })
    ).rejects.toThrow("injected rubric write failure");

    await expect(repository.getAttempt("user-1", "attempt-1")).resolves.toMatchObject({
      status: "in_progress",
      rubricScores: { "read flow": 1 }
    });
  });

  it("rolls back the receipt-backed mastery aggregate when its D1 batch fails", async () => {
    const database = new CalculatedMasteryD1Double();
    const repository = new D1LearnerRepository(database as unknown as D1Database);
    const input = {
      userId: "user-1",
      attemptId: "attempt-a",
      update: {
        status: "completed" as const,
        completedAt: "2026-08-09T12:30:00.000Z",
        durationSeconds: 1_800,
        selfScore: 3,
        rubricScores: { "read flow": 4 }
      },
      operationKey: "00000000-0000-4000-8000-000000000006",
      requestHash: "calculated-mastery-request",
      receiptCreatedAt: "2026-08-09T12:30:00.000Z",
      receiptExpiresAt: "2026-09-08T12:30:00.000Z",
      response: {
        attempt: {
          id: "attempt-a",
          userId: "user-1",
          questionId: "redis-cache-aside",
          questionVersion: 1,
          mode: "learn" as const,
          status: "completed" as const,
          startedAt: "2026-08-09T12:00:00.000Z",
          completedAt: "2026-08-09T12:30:00.000Z",
          durationSeconds: 1_800,
          selfScore: 3,
          rubricScores: { "read flow": 4 }
        }
      },
      masteryContext: { topicId: "redis-caching", questionIds: ["redis-cache-aside"] }
    };
    database.failNextBatch = true;

    await expect(repository.completeAttemptWithReceipt(input)).rejects.toThrow("injected calculated-mastery batch failure");

    await expect(repository.getAttempt("user-1", "attempt-a")).resolves.toMatchObject({
      status: "in_progress"
    });

    // A batch rollback must leave neither a pending receipt nor a partial
    // aggregate behind. Retrying the exact envelope therefore completes once.
    await expect(repository.completeAttemptWithReceipt(input)).resolves.toMatchObject({
      outcome: "completed",
      response: { mastery: { attemptsCount: 1, masteryScore: 75 } }
    });
    expect(database.receiptJson(input.operationKey)).toContain('"attemptsCount":1');
  });

  it("recalculates same-topic mastery in D1 and never rewrites a finalized replay receipt", async () => {
    const database = new CalculatedMasteryD1Double();
    const repository = new D1LearnerRepository(database as unknown as D1Database);
    const common = {
      userId: "user-1",
      masteryContext: { topicId: "redis-caching", questionIds: ["redis-cache-aside", "redis-invalidation"] },
      receiptCreatedAt: "2026-08-09T12:30:00.000Z",
      receiptExpiresAt: "2026-09-08T12:30:00.000Z"
    };
    const inputFor = (attemptId: "attempt-a" | "attempt-b", score: number, operationKey: string, dimension: string) => ({
      ...common,
      attemptId,
      update: {
        status: "completed" as const,
        completedAt: attemptId === "attempt-a" ? "2026-08-09T12:30:00.000Z" : "2026-08-09T12:31:00.000Z",
        durationSeconds: 1_800,
        selfScore: score,
        rubricScores: { [dimension]: score }
      },
      operationKey,
      requestHash: `hash-${attemptId}`,
      response: {
        attempt: {
          id: attemptId,
          userId: "user-1",
          questionId: attemptId === "attempt-a" ? "redis-cache-aside" : "redis-invalidation",
          questionVersion: 1,
          mode: attemptId === "attempt-a" ? "learn" as const : "mock" as const,
          status: "completed" as const,
          startedAt: attemptId === "attempt-a" ? "2026-08-09T12:00:00.000Z" : "2026-08-09T12:01:00.000Z",
          completedAt: attemptId === "attempt-a" ? "2026-08-09T12:30:00.000Z" : "2026-08-09T12:31:00.000Z",
          durationSeconds: 1_800,
          selfScore: score,
          rubricScores: { [dimension]: score }
        }
      }
    });

    const firstInput = inputFor("attempt-a", 1, "00000000-0000-4000-8000-000000000041", "read flow");
    const first = await repository.completeAttemptWithReceipt(firstInput);
    expect(first).toMatchObject({ outcome: "completed", response: { mastery: { attemptsCount: 1, masteryScore: 25 } } });
    const originalReceipt = database.receiptJson(firstInput.operationKey);

    const second = await repository.completeAttemptWithReceipt(inputFor("attempt-b", 4, "00000000-0000-4000-8000-000000000042", "write path"));
    expect(second).toMatchObject({ outcome: "completed", response: { mastery: { attemptsCount: 2, masteryScore: 70 } } });
    expect(database.masteryFor("redis-caching")).toMatchObject({ attempts_count: 2, mastery_score: 70 });

    // Model a request that looked up A before its original receipt became
    // visible, then reached the batch after B's same-topic completion.
    database.hideNextReceiptRead = true;
    const delayedDuplicate = await repository.completeAttemptWithReceipt(firstInput);
    expect(delayedDuplicate).toMatchObject({ outcome: "replayed", response: { mastery: { attemptsCount: 1, masteryScore: 25 } } });
    expect(database.receiptJson(firstInput.operationKey)).toBe(originalReceipt);
  });

  it("commits score replacement and attempt completion together in a D1 batch", async () => {
    const database = new AtomicityD1Double();
    const repository = new D1LearnerRepository(database as unknown as D1Database);

    const updated = await repository.updateAttempt("user-1", "attempt-1", {
      status: "completed",
      completedAt: "2026-08-09T12:30:00.000Z",
      durationSeconds: 1_800,
      selfScore: 3,
      rubricScores: { "read flow": 4 }
    });

    expect(updated).toMatchObject({
      status: "completed",
      selfScore: 3,
      rubricScores: { "read flow": 4 }
    });
  });

  it("stores a completion receipt atomically and replays the original D1 response", async () => {
    const database = new AtomicityD1Double();
    const repository = new D1LearnerRepository(database as unknown as D1Database);
    const input = {
      userId: "user-1",
      attemptId: "attempt-1",
      update: {
        status: "completed" as const,
        completedAt: "2026-08-09T12:30:00.000Z",
        durationSeconds: 1_800,
        selfScore: 3,
        rubricScores: { "read flow": 4 }
      },
      operationKey: "00000000-0000-4000-8000-000000000003",
      requestHash: "request-hash-1",
      receiptCreatedAt: "2026-08-09T12:30:00.000Z",
      receiptExpiresAt: "2026-09-08T12:30:00.000Z",
      response: {
        attempt: {
          id: "attempt-1",
          userId: "user-1",
          questionId: "redis-cache-aside",
          questionVersion: 1,
          mode: "learn" as const,
          status: "completed" as const,
          startedAt: "2026-08-09T12:00:00.000Z",
          completedAt: "2026-08-09T12:30:00.000Z",
          durationSeconds: 1_800,
          selfScore: 3,
          rubricScores: { "read flow": 4 }
        },
        mastery: {
          userId: "user-1",
          topicId: "redis-caching",
          masteryScore: 75,
          confidence: 3,
          attemptsCount: 1,
          lastPracticedAt: "2026-08-09T12:30:00.000Z",
          nextReviewAt: "2026-08-17T12:30:00.000Z"
        }
      }
    };

    const first = await repository.completeAttemptWithReceipt(input);
    expect(first).toMatchObject({ outcome: "completed", response: input.response });

    const replay = await repository.completeAttemptWithReceipt({ ...input, response: undefined });
    expect(replay).toMatchObject({ outcome: "replayed", response: input.response });

    const conflict = await repository.completeAttemptWithReceipt({
      ...input,
      requestHash: "request-hash-2",
      response: undefined
    });
    expect(conflict).toEqual({ outcome: "idempotency_key_reused" });
    await expect(repository.getAttempt("user-1", "attempt-1")).resolves.toMatchObject({
      status: "completed",
      mode: "learn",
      rubricScores: { "read flow": 4 }
    });
  });
});
