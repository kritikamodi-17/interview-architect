import type { InterviewQuestion } from "@interview-architect/domain";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app";
import { FixedWindowRateLimiter, type RateLimiter } from "../src/lib/rate-limit";
import { MemoryLearnerRepository } from "../src/repository/memory-repository";

const questions: InterviewQuestion[] = [
  {
    id: "redis-cache-aside",
    slug: "redis-cache-aside",
    version: 1,
    status: "published",
    moduleId: "caching-redis",
    primaryTopicId: "redis-caching",
    title: "Design a cache-aside product catalog",
    type: "design",
    difficulty: "intermediate",
    estimatedMinutes: 30,
    tags: ["redis", "cache", "api"],
    prerequisites: [],
    prompt: {
      question: "How would you design a cache-aside product catalog?",
      followUps: ["How do you avoid a stampede?"]
    },
    hints: ["Start with read flow."],
    answer: {
      summary: "Read cache, load on miss, then populate.",
      sections: [{ heading: "Flow", markdown: "Read cache before the database." }],
      tradeoffs: ["Stale reads are possible."],
      failureModes: ["Hot keys can stampede."],
      keyTerms: ["TTL"]
    },
    rubric: [
      {
        dimension: "read flow",
        weight: 1,
        mustMention: ["cache miss"],
        scoreGuide: { 0: "Missing", 1: "Basic", 2: "Partial", 3: "Strong", 4: "Excellent" }
      }
    ],
    commonPitfalls: ["Forgetting invalidation."],
    references: [],
    reviewedAt: "2026-08-01T00:00:00.000Z"
  },
  {
    id: "kafka-consumer-groups",
    slug: "kafka-consumer-groups",
    version: 2,
    status: "published",
    moduleId: "queues-kafka",
    primaryTopicId: "kafka-consumers",
    title: "Scale an order consumer group",
    type: "design",
    difficulty: "senior",
    estimatedMinutes: 45,
    tags: ["kafka", "reliability", "distributed-systems"],
    prerequisites: [],
    prompt: {
      question: "How do you scale order consumers safely?",
      followUps: ["What happens during a rebalance?"]
    },
    hints: ["Relate consumers to partitions."],
    answer: {
      summary: "Partitions cap consumer parallelism.",
      sections: [{ heading: "Parallelism", markdown: "One consumer owns one partition at a time." }],
      tradeoffs: ["More partitions increase overhead."],
      failureModes: ["Poison records can block a partition."],
      keyTerms: ["consumer group"]
    },
    rubric: [
      {
        dimension: "partition ownership",
        weight: 1,
        mustMention: ["partition"],
        scoreGuide: { 0: "Missing", 1: "Basic", 2: "Partial", 3: "Strong", 4: "Excellent" }
      }
    ],
    commonPitfalls: ["Assuming consumers exceed partitions."],
    references: [],
    reviewedAt: "2026-08-01T00:00:00.000Z"
  }
];

function makeTestApp(options: { sessionTtlSeconds?: number; sessionCreationRateLimiter?: RateLimiter } = {}) {
  let id = 0;
  let current = new Date("2026-08-09T12:00:00.000Z");
  const repository = new MemoryLearnerRepository();
  const app = createApp({
    repository,
    questions,
    now: () => current,
    createId: () => `id-${++id}`,
    createSessionToken: () => `opaque-token-${++id}`,
    ...options
  });
  return {
    app,
    repository,
    advanceDays(days: number) {
      current = new Date(current.getTime() + days * 24 * 60 * 60 * 1_000);
    }
  };
}

function mutationHeaders(cookie?: string, origin = "http://localhost") {
  return {
    Origin: origin,
    "content-type": "application/json",
    ...(cookie ? { Cookie: cookie } : {})
  };
}

async function createSession(app: ReturnType<typeof makeTestApp>["app"]): Promise<string> {
  const response = await app.request("http://localhost/api/v1/session/anonymous", {
    method: "POST",
    headers: mutationHeaders(),
    body: "{}"
  });
  expect(response.status).toBe(201);
  const cookie = response.headers.get("set-cookie")?.split(";", 1)[0];
  expect(cookie).toBeTruthy();
  return cookie as string;
}

describe("Interview Architect API", () => {
  it("serves a health response without learner state", async () => {
    const { app } = makeTestApp();
    const response = await app.request("http://localhost/api/v1/health");
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ status: "ok", service: "interview-architect-api" });
  });

  it("creates an opaque, HttpOnly anonymous session and exposes its public profile", async () => {
    const { app } = makeTestApp();
    const cookie = await createSession(app);
    expect(cookie).toMatch(/^ia_session=/);

    const response = await app.request("http://localhost/api/v1/me", { headers: { Cookie: cookie } });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ user: { id: "id-2" }, session: { expiresAt: expect.any(String) } });

    const { app: productionApp } = makeTestApp();
    const productionResponse = await productionApp.request("https://interview.example/api/v1/session/anonymous", {
      method: "POST",
      headers: mutationHeaders(undefined, "https://interview.example"),
      body: "{}"
    });
    expect(productionResponse.headers.get("set-cookie")).toContain("HttpOnly");
    expect(productionResponse.headers.get("set-cookie")).toContain("SameSite=Lax");
    expect(productionResponse.headers.get("set-cookie")).toContain("Secure");
  });

  it("rejects personal data without a session and rejects cross-origin writes", async () => {
    const { app } = makeTestApp();
    const unauthenticated = await app.request("http://localhost/api/v1/progress");
    expect(unauthenticated.status).toBe(401);

    const crossOrigin = await app.request("http://localhost/api/v1/session/anonymous", {
      method: "POST",
      headers: mutationHeaders(undefined, "https://evil.example"),
      body: "{}"
    });
    expect(crossOrigin.status).toBe(403);
    await expect(crossOrigin.json()).resolves.toMatchObject({ error: { code: "untrusted_origin" } });
  });

  it("cleans expired anonymous sessions and their learner state when authenticating", async () => {
    const { app, repository, advanceDays } = makeTestApp();
    const cookie = await createSession(app);

    advanceDays(31);
    const expired = await app.request("http://localhost/api/v1/me", { headers: { Cookie: cookie } });
    expect(expired.status).toBe(401);
    await expect(repository.getUser("id-2")).resolves.toBeUndefined();

    const replacement = await app.request("http://localhost/api/v1/session/anonymous", {
      method: "POST",
      headers: mutationHeaders(),
      body: "{}"
    });
    expect(replacement.status).toBe(201);
  });

  it("cleans expired anonymous sessions before creating a replacement session", async () => {
    const { app, repository, advanceDays } = makeTestApp();
    const cookie = await createSession(app);

    advanceDays(31);
    const replacement = await app.request("http://localhost/api/v1/session/anonymous", {
      method: "POST",
      headers: mutationHeaders(cookie),
      body: "{}"
    });
    expect(replacement.status).toBe(201);
    await expect(repository.getUser("id-2")).resolves.toBeUndefined();
  });

  it("returns one in-progress attempt when a learner retries or concurrently starts the same question", async () => {
    const { app, repository } = makeTestApp();
    const cookie = await createSession(app);
    const start = () =>
      app.request("http://localhost/api/v1/attempts", {
        method: "POST",
        headers: mutationHeaders(cookie),
        body: JSON.stringify({ questionId: "redis-cache-aside", questionVersion: 1 })
      });

    const responses = await Promise.all([start(), start()]);
    expect(responses.map((response) => response.status).sort()).toEqual([200, 201]);
    const payloads = (await Promise.all(responses.map((response) => response.json()))) as Array<{
      attempt: { id: string; status: string };
    }>;
    expect(payloads[0]?.attempt.id).toBe(payloads[1]?.attempt.id);
    expect(payloads[0]?.attempt.status).toBe("in_progress");
    expect(payloads[0]?.attempt).toMatchObject({ mode: "learn" });
    await expect(repository.listAttempts("id-2")).resolves.toEqual([
      expect.objectContaining({ id: payloads[0]?.attempt.id, questionId: "redis-cache-aside" })
    ]);

    const abandoned = await app.request(
      `http://localhost/api/v1/attempts/${payloads[0]?.attempt.id}`,
      {
        method: "PATCH",
        headers: mutationHeaders(cookie),
        body: JSON.stringify({ status: "abandoned" })
      }
    );
    expect(abandoned.status).toBe(200);

    const restarted = await start();
    expect(restarted.status).toBe(201);
    await expect(repository.listAttempts("id-2")).resolves.toHaveLength(2);
  });

  it("validates practice mode and preserves the original mode for an active retry", async () => {
    const { app } = makeTestApp();
    const cookie = await createSession(app);

    const invalid = await app.request("http://localhost/api/v1/attempts", {
      method: "POST",
      headers: mutationHeaders(cookie),
      body: JSON.stringify({ questionId: "kafka-consumer-groups", mode: "coached" })
    });
    expect(invalid.status).toBe(422);

    const first = await app.request("http://localhost/api/v1/attempts", {
      method: "POST",
      headers: mutationHeaders(cookie),
      body: JSON.stringify({ questionId: "kafka-consumer-groups", questionVersion: 2, mode: "mock" })
    });
    expect(first.status).toBe(201);
    const firstPayload = (await first.json()) as { attempt: { id: string; mode: string } };
    expect(firstPayload.attempt.mode).toBe("mock");

    const retry = await app.request("http://localhost/api/v1/attempts", {
      method: "POST",
      headers: mutationHeaders(cookie),
      body: JSON.stringify({ questionId: "kafka-consumer-groups", questionVersion: 2, mode: "learn" })
    });
    expect(retry.status).toBe(200);
    await expect(retry.json()).resolves.toMatchObject({ attempt: { id: firstPayload.attempt.id, mode: "mock" } });
  });

  it("requires an idempotency key and safely replays a completed attempt", async () => {
    const { app } = makeTestApp();
    const cookie = await createSession(app);
    const started = await app.request("http://localhost/api/v1/attempts", {
      method: "POST",
      headers: mutationHeaders(cookie),
      body: JSON.stringify({ questionId: "redis-cache-aside", mode: "mock" })
    });
    const { attempt } = (await started.json()) as { attempt: { id: string } };
    const completionBody = JSON.stringify({
      status: "completed",
      durationSeconds: 1_200,
      selfScore: 3,
      rubricScores: { "read flow": 3 }
    });

    const missingKey = await app.request(`http://localhost/api/v1/attempts/${attempt.id}`, {
      method: "PATCH",
      headers: mutationHeaders(cookie),
      body: completionBody
    });
    expect(missingKey.status).toBe(400);
    await expect(missingKey.json()).resolves.toMatchObject({ error: { code: "idempotency_key_required" } });

    const operationKey = "00000000-0000-4000-8000-000000000001";
    const headers = { ...mutationHeaders(cookie), "Idempotency-Key": operationKey };
    const completed = await app.request(`http://localhost/api/v1/attempts/${attempt.id}`, {
      method: "PATCH",
      headers,
      body: completionBody
    });
    expect(completed.status).toBe(200);
    const completionPayload = await completed.json();

    const replay = await app.request(`http://localhost/api/v1/attempts/${attempt.id}`, {
      method: "PATCH",
      headers,
      body: completionBody
    });
    expect(replay.status).toBe(200);
    expect(replay.headers.get("idempotency-replayed")).toBe("true");
    await expect(replay.json()).resolves.toEqual(completionPayload);

    const conflict = await app.request(`http://localhost/api/v1/attempts/${attempt.id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({
        status: "completed",
        durationSeconds: 1_200,
        selfScore: 4,
        rubricScores: { "read flow": 4 }
      })
    });
    expect(conflict.status).toBe(409);
    await expect(conflict.json()).resolves.toMatchObject({ error: { code: "idempotency_key_reused" } });

    const progress = await app.request("http://localhost/api/v1/progress", { headers: { Cookie: cookie } });
    await expect(progress.json()).resolves.toMatchObject({
      summary: { completedAttempts: 1, topicsPracticed: 1 },
      mastery: [{ topicId: "redis-caching", attemptsCount: 1 }]
    });
  });

  it("deletes anonymous learner data and clears the local session on request", async () => {
    const { app, repository } = makeTestApp();
    const cookie = await createSession(app);

    const started = await app.request("http://localhost/api/v1/attempts", {
      method: "POST",
      headers: mutationHeaders(cookie),
      body: JSON.stringify({ questionId: "redis-cache-aside" })
    });
    expect(started.status).toBe(201);

    const deleted = await app.request("http://localhost/api/v1/me", {
      method: "DELETE",
      headers: mutationHeaders(cookie),
      body: "{}"
    });
    expect(deleted.status).toBe(200);
    expect(deleted.headers.get("set-cookie")).toContain("Max-Age=0");
    expect(deleted.headers.get("clear-site-data")).toBe('"storage"');
    await expect(deleted.json()).resolves.toEqual({ deleted: true });
    await expect(repository.getUser("id-2")).resolves.toBeUndefined();
    await expect(repository.listAttempts("id-2")).resolves.toEqual([]);

    const noLongerAuthenticated = await app.request("http://localhost/api/v1/me", {
      headers: { Cookie: cookie }
    });
    expect(noLongerAuthenticated.status).toBe(401);
  });

  it("rate-limits only repeated anonymous-session creation from the same Cloudflare client", async () => {
    const { app, advanceDays } = makeTestApp({
      sessionCreationRateLimiter: new FixedWindowRateLimiter({ limit: 2, windowMs: 60_000 })
    });
    const headers = { ...mutationHeaders(), "CF-Connecting-IP": "203.0.113.17" };

    const first = await app.request("http://localhost/api/v1/session/anonymous", {
      method: "POST",
      headers,
      body: "{}"
    });
    expect(first.status).toBe(201);
    const firstCookie = first.headers.get("set-cookie")?.split(";", 1)[0];
    expect(firstCookie).toBeTruthy();

    const second = await app.request("http://localhost/api/v1/session/anonymous", {
      method: "POST",
      headers,
      body: "{}"
    });
    expect(second.status).toBe(201);

    const limited = await app.request("http://localhost/api/v1/session/anonymous", {
      method: "POST",
      headers,
      body: "{}"
    });
    expect(limited.status).toBe(429);
    expect(limited.headers.get("retry-after")).toBe("60");
    await expect(limited.json()).resolves.toMatchObject({ error: { code: "rate_limited" } });

    const renewal = await app.request("http://localhost/api/v1/session/anonymous", {
      method: "POST",
      headers: { ...headers, Cookie: firstCookie as string },
      body: "{}"
    });
    expect(renewal.status).toBe(200);

    advanceDays(1);
    const afterWindow = await app.request("http://localhost/api/v1/session/anonymous", {
      method: "POST",
      headers,
      body: "{}"
    });
    expect(afterWindow.status).toBe(201);
  });

  it("persists only scored attempt metadata, progress, bookmarks, review state, and coaching inputs", async () => {
    const { app, advanceDays } = makeTestApp();
    const cookie = await createSession(app);

    const invalidAnswerBody = await app.request("http://localhost/api/v1/attempts", {
      method: "POST",
      headers: mutationHeaders(cookie),
      body: JSON.stringify({ questionId: "redis-cache-aside", answer: "do not persist this" })
    });
    expect(invalidAnswerBody.status).toBe(422);

    const started = await app.request("http://localhost/api/v1/attempts", {
      method: "POST",
      headers: mutationHeaders(cookie),
      body: JSON.stringify({ questionId: "redis-cache-aside", questionVersion: 1 })
    });
    expect(started.status).toBe(201);
    const { attempt } = (await started.json()) as { attempt: { id: string; questionVersion: number } };
    expect(attempt.questionVersion).toBe(1);

    const completed = await app.request(`http://localhost/api/v1/attempts/${attempt.id}`, {
      method: "PATCH",
      headers: { ...mutationHeaders(cookie), "Idempotency-Key": "00000000-0000-4000-8000-000000000002" },
      body: JSON.stringify({
        status: "completed",
        durationSeconds: 1440,
        selfScore: 0,
        rubricScores: { "read flow": 0 }
      })
    });
    expect(completed.status).toBe(200);
    const completedPayload = (await completed.json()) as {
      attempt: { status: string; rubricScores?: Record<string, number> };
      mastery?: { topicId: string; nextReviewAt: string };
    };
    expect(completedPayload.attempt).toMatchObject({ status: "completed", rubricScores: { "read flow": 0 } });
    expect(completedPayload.mastery?.topicId).toBe("redis-caching");

    const bookmark = await app.request("http://localhost/api/v1/bookmarks/redis-cache-aside", {
      method: "PUT",
      headers: mutationHeaders(cookie),
      body: JSON.stringify({ bookmarked: true })
    });
    expect(bookmark.status).toBe(200);

    const progress = await app.request("http://localhost/api/v1/progress", { headers: { Cookie: cookie } });
    expect(progress.status).toBe(200);
    await expect(progress.json()).resolves.toMatchObject({
      bookmarks: ["redis-cache-aside"],
      summary: { completedAttempts: 1, bookmarkedQuestions: 1, topicsPracticed: 1 }
    });

    const coach = await app.request("http://localhost/api/v1/coach/next", {
      method: "POST",
      headers: mutationHeaders(cookie),
      body: JSON.stringify({ availableMinutes: 30, targetRole: "backend" })
    });
    expect(coach.status).toBe(200);
    await expect(coach.json()).resolves.toMatchObject({ recommendation: { question: { id: expect.any(String) } } });

    advanceDays(1);
    const reviewQueue = await app.request("http://localhost/api/v1/review-queue", {
      headers: { Cookie: cookie }
    });
    expect(reviewQueue.status).toBe(200);
    await expect(reviewQueue.json()).resolves.toMatchObject({
      items: [{ question: { id: "redis-cache-aside" }, mastery: { topicId: "redis-caching" } }]
    });
  });
});
