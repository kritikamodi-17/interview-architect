import { describe, expect, it } from "vitest";
import {
  LEARNER_SNAPSHOT_KEY,
  STUDY_STORAGE_PREFIX,
  clearInterviewArchitectStorage,
  createPracticeArtifact,
  loadPendingCompletion,
  loadPracticeArtifact,
  removePracticeArtifact,
  savePendingCompletion,
  savePracticeArtifact,
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

  keys(): string[] {
    return [...this.values.keys()];
  }
}

class FailingWriteStorage extends MemoryStorage {
  failWrites = false;

  override setItem(key: string, value: string): void {
    if (this.failWrites) throw new Error("Storage is full");
    super.setItem(key, value);
  }
}

class FailingRemovalStorage extends MemoryStorage {
  failKey?: string;

  override removeItem(key: string): void {
    if (key === this.failKey) throw new Error("Storage cannot remove this key");
    super.removeItem(key);
  }
}

class UnavailableStorage implements StorageLike {
  get length(): number {
    throw new Error("Storage is unavailable");
  }

  key(): string | null {
    throw new Error("Storage is unavailable");
  }

  getItem(): string | null {
    throw new Error("Storage is unavailable");
  }

  setItem(): void {
    throw new Error("Storage is unavailable");
  }

  removeItem(): void {
    throw new Error("Storage is unavailable");
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

  it("keeps a legacy draft intact when its structured migration cannot be written", () => {
    const storage = new FailingWriteStorage();
    const legacyKey = "interview-architect:draft:redis-cache-aside";
    storage.setItem(legacyKey, "legacy design notes");
    storage.failWrites = true;

    const loaded = loadPracticeArtifact({
      questionId: "redis-cache-aside",
      questionVersion: 1,
      mode: "learn",
      attemptId: "attempt-legacy"
    }, storage);

    expect(loaded).toEqual({ ok: false, reason: "quota" });
    expect(storage.getItem(legacyKey)).toBe("legacy design notes");
  });

  it("promotes a staging workspace after an attempt starts without leaving a duplicate draft", () => {
    const storage = new MemoryStorage();
    const staged = createPracticeArtifact({
      questionId: "redis-cache-aside",
      questionVersion: 1,
      mode: "learn"
    });
    staged.sections.architecture = "Cache lookup, lease, and bounded stale response.";
    expect(savePracticeArtifact(staged, storage)).toEqual({ ok: true, value: undefined });

    const loaded = loadPracticeArtifact({
      questionId: "redis-cache-aside",
      questionVersion: 1,
      mode: "learn",
      attemptId: "attempt-promoted"
    }, storage);

    expect(loaded).toMatchObject({
      ok: true,
      value: {
        attemptId: "attempt-promoted",
        sections: { architecture: "Cache lookup, lease, and bounded stale response." }
      }
    });
    expect(storage.keys()).toEqual(["interview-architect:studio:v1:attempt:attempt-promoted"]);
  });

  it("removes both an attempt artifact and its matching pre-start draft when discarding", () => {
    const storage = new MemoryStorage();
    const staged = createPracticeArtifact({ questionId: "redis-cache-aside", questionVersion: 1, mode: "learn" });
    const active = createPracticeArtifact({
      questionId: "redis-cache-aside",
      questionVersion: 1,
      mode: "learn",
      attemptId: "attempt-discarded"
    });
    expect(savePracticeArtifact(staged, storage)).toEqual({ ok: true, value: undefined });
    expect(savePracticeArtifact(active, storage)).toEqual({ ok: true, value: undefined });

    expect(removePracticeArtifact({
      questionId: "redis-cache-aside",
      questionVersion: 1,
      mode: "learn",
      attemptId: "attempt-discarded"
    }, storage)).toEqual({ ok: true, value: undefined });
    expect(storage.keys()).toEqual([]);
  });

  it("erases only Interview Architect keys", () => {
    const storage = new MemoryStorage();
    storage.setItem(LEARNER_SNAPSHOT_KEY, "{}");
    storage.setItem("interview-architect:draft:legacy-question", "legacy private note");
    storage.setItem("interview-architect:studio:v1:staging:redis-cache-aside:1:learn", "{}");
    storage.setItem("interview-architect:studio:v1:attempt:attempt-4", "{}");
    storage.setItem("interview-architect:studio:v1:completion:attempt-4", "{}");
    storage.setItem("another-app:settings", "keep");

    expect(clearInterviewArchitectStorage(storage)).toMatchObject({ ok: true, failedKeys: [] });
    expect(storage.keys().some((key) => key.startsWith(STUDY_STORAGE_PREFIX))).toBe(false);
    expect(storage.getItem("another-app:settings")).toBe("keep");
  });

  it("reports partial erasure while continuing through the remaining app-owned keys", () => {
    const storage = new FailingRemovalStorage();
    const blockedKey = "interview-architect:studio:v1:attempt:blocked";
    storage.setItem(LEARNER_SNAPSHOT_KEY, "{}");
    storage.setItem(blockedKey, "{}");
    storage.setItem("interview-architect:studio:v1:completion:removable", "{}");
    storage.failKey = blockedKey;

    expect(clearInterviewArchitectStorage(storage)).toEqual({
      ok: false,
      removedKeys: [LEARNER_SNAPSHOT_KEY, "interview-architect:studio:v1:completion:removable"],
      failedKeys: [blockedKey],
      reason: "partial"
    });
    expect(storage.getItem(blockedKey)).toBe("{}");
    expect(storage.getItem(LEARNER_SNAPSHOT_KEY)).toBeNull();
  });

  it("reports unavailable storage without attempting an unsafe global clear", () => {
    expect(clearInterviewArchitectStorage(new UnavailableStorage())).toEqual({
      ok: false,
      removedKeys: [],
      failedKeys: [],
      reason: "unavailable"
    });
  });
});
