import { describe, expect, it } from "vitest";
import { D1LearnerRepository } from "../src/repository/d1-repository";

interface StoredAttempt {
  id: string;
  user_id: string;
  question_id: string;
  question_version: number;
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
    status: "in_progress",
    started_at: "2026-08-09T12:00:00.000Z",
    completed_at: null,
    duration_seconds: null,
    self_score: null
  };
  private scores = new Map<string, number>([["read flow", 1]]);
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
    const results = (statements as unknown as TestStatement[]).map((statement) =>
      this.applyBatchStatement(statement, nextAttempt, nextScores)
    );
    this.attempt = nextAttempt;
    this.scores = nextScores;
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

  private first(sql: string, values: unknown[]): StoredAttempt | undefined {
    if (!this.normalise(sql).includes("from practice_attempts")) return undefined;
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
    scores: Map<string, number>
  ) {
    const sql = this.normalise(statement.sql);
    if (sql.startsWith("delete from attempt_rubric_scores")) {
      scores.clear();
      return this.result([], 1);
    }
    if (sql.startsWith("insert into attempt_rubric_scores")) {
      const [, dimension, score] = statement.values;
      scores.set(String(dimension), Number(score));
      return this.result([], 1);
    }
    if (sql.startsWith("update practice_attempts")) {
      this.applyUpdate(attempt, statement.values);
      return this.result([], 1);
    }
    return this.result();
  }

  private applyUpdate(attempt: StoredAttempt, values: unknown[]): void {
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

    const [id, userId, questionId, questionVersion, startedAt] = values;
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
      startedAt: "2026-08-09T12:00:00.000Z"
    };

    const [first, retry] = await Promise.all([
      repository.findOrCreateInProgressAttempt({ ...input, id: "attempt-1" }),
      repository.findOrCreateInProgressAttempt({ ...input, id: "attempt-2" })
    ]);

    expect([first.created, retry.created].filter(Boolean)).toHaveLength(1);
    expect(first.attempt.id).toBe(retry.attempt.id);
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
});
