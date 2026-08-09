import { describe, expect, it } from "vitest";
import {
  LEARNER_SNAPSHOT_KEY,
  clearInterviewArchitectStorage,
  loadPendingCompletion,
  loadPracticeArtifact,
  savePendingCompletion,
  type StorageLike
} from "../src/lib/study-storage";
import { pendingCompletionForAttempt } from "../src/hooks/usePracticeSession";

class MemoryStorage implements StorageLike {
  private readonly values = new Map<string, string>();

  get length(): number {
    return this.values.size;
  }

  key(index: number): string | null {
    return [...this.values.keys()][index] ?? null;
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }
}

describe("Design Studio private storage", () => {
  it("rehydrates the exact completion envelope after a simulated reload", () => {
    const storage = new MemoryStorage();
    const pending = {
      version: 1 as const,
      attemptId: "attempt-1",
      operationKey: "00000000-0000-4000-8000-000000000101",
      input: {
        durationSeconds: 1_217,
        selfScore: 3,
        rubricScores: { "Problem framing": 3, "Technical design": 4 }
      },
      updatedAt: "2026-08-09T12:00:00.000Z"
    };

    expect(savePendingCompletion(pending, storage)).toEqual({ ok: true, value: undefined });

    // A fresh lifecycle hook sees only storage, not the previous tab's ref.
    const rehydrated = loadPendingCompletion(pending.attemptId, storage);
    expect(pendingCompletionForAttempt(pending.attemptId, rehydrated)).toEqual(pending);
  });

  it("keeps the same retry envelope in memory when storage is unavailable in a live tab", () => {
    const pending = {
      version: 1 as const,
      attemptId: "attempt-2",
      operationKey: "00000000-0000-4000-8000-000000000102",
      input: { durationSeconds: 900, selfScore: 2, rubricScores: { "Failure handling": 2 } },
      updatedAt: "2026-08-09T12:05:00.000Z"
    };

    const retained = pendingCompletionForAttempt(
      pending.attemptId,
      { ok: false, reason: "unavailable" },
      pending
    );

    expect(retained).toBe(pending);
    expect(pendingCompletionForAttempt("another-attempt", { ok: false, reason: "unavailable" }, pending)).toBeUndefined();
  });

  it("migrates a legacy draft only after the structured artifact can be written", () => {
    const storage = new MemoryStorage();
    storage.setItem("interview-architect:draft:redis-cache-aside", "legacy design notes");

    const loaded = loadPracticeArtifact({
      questionId: "redis-cache-aside",
      questionVersion: 1,
      mode: "learn",
      attemptId: "attempt-3"
    }, storage);

    expect(loaded).toMatchObject({ ok: true, value: { attemptId: "attempt-3", sections: { architecture: "legacy design notes" } } });
    expect(storage.getItem("interview-architect:draft:redis-cache-aside")).toBeNull();
  });

  it("erases only Interview Architect keys", () => {
    const storage = new MemoryStorage();
    storage.setItem(LEARNER_SNAPSHOT_KEY, "{}");
    storage.setItem("interview-architect:studio:v1:completion:attempt-4", "{}");
    storage.setItem("another-app:settings", "keep");

    expect(clearInterviewArchitectStorage(storage)).toMatchObject({ ok: true, failedKeys: [] });
    expect(storage.getItem(LEARNER_SNAPSHOT_KEY)).toBeNull();
    expect(storage.getItem("another-app:settings")).toBe("keep");
  });
});
