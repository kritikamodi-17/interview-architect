import {
  calculateMastery,
  nextReviewAt,
  recommendNextQuestion,
  type CoachRequest,
  type InterviewQuestion,
  type LearnerProgress,
  type TopicMastery
} from "@interview-architect/domain";
import { setCookie } from "hono/cookie";
import { Hono, type Context, type MiddlewareHandler } from "hono";
import { z } from "zod";
import { errorResponse, parseJson, parseRouteId } from "./lib/http";
import {
  cloudflareClientAddress,
  FixedWindowRateLimiter,
  type RateLimiter
} from "./lib/rate-limit";
import {
  hashSessionToken,
  hasTrustedOrigin,
  isProductionRequest,
  newId,
  newSessionToken,
  readCookie,
  SESSION_COOKIE_NAME,
  SESSION_TTL_SECONDS
} from "./lib/security";
import type { LearnerRepository } from "./repository/repository";
import type {
  AppVariables,
  AuthenticatedSession,
  ProgressResponse,
  ReviewQueueItem,
  WorkerBindings
} from "./types";

type ApiEnv = { Bindings: WorkerBindings; Variables: AppVariables };
type ApiContext = Context<ApiEnv>;

export interface AppDependencies {
  repository: LearnerRepository;
  questions: InterviewQuestion[];
  now?: () => Date;
  createId?: () => string;
  createSessionToken?: () => string;
  sessionTtlSeconds?: number;
  /** Optional module-scoped limiter used by the deployed Worker. */
  sessionCreationRateLimiter?: RateLimiter;
}

const questionIdSchema = z.string().min(1).max(160).regex(/^[a-zA-Z0-9][a-zA-Z0-9_:-]*$/);
const attemptCreateSchema = z
  .object({
    questionId: questionIdSchema,
    questionVersion: z.number().int().positive().max(10_000).optional()
  })
  .strict();

const rubricScoreSchema = z.number().int().min(0).max(4);
const attemptPatchSchema = z
  .object({
    status: z.enum(["completed", "abandoned"]),
    durationSeconds: z.number().int().min(0).max(8 * 60 * 60).optional(),
    selfScore: rubricScoreSchema.optional(),
    rubricScores: z.record(z.string().min(1).max(120), rubricScoreSchema).optional()
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.status === "completed" && value.selfScore === undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["selfScore"],
        message: "A completed attempt requires a selfScore from 0 to 4."
      });
    }
    if (value.status === "abandoned" && (value.selfScore !== undefined || value.rubricScores !== undefined)) {
      ctx.addIssue({
        code: "custom",
        message: "Scores can only be recorded for a completed attempt."
      });
    }
  });

const bookmarkSchema = z.object({ bookmarked: z.boolean() }).strict();
const coachSchema = z
  .object({
    availableMinutes: z.number().int().min(5).max(8 * 60),
    targetRole: z.enum(["backend", "platform", "general"]),
    preferredTopicId: z.string().min(1).max(160).optional()
  })
  .strict();

function publicSession(auth: AuthenticatedSession) {
  return {
    user: auth.user,
    session: { expiresAt: auth.session.expiresAt }
  };
}

function normaliseQuestions(questions: InterviewQuestion[]): InterviewQuestion[] {
  const seen = new Set<string>();
  return questions
    .filter((question) => question.status === "published")
    .filter((question) => {
      if (seen.has(question.id)) return false;
      seen.add(question.id);
      return true;
    });
}

function isReviewDue(mastery: TopicMastery, now: Date): boolean {
  return Boolean(mastery.nextReviewAt && new Date(mastery.nextReviewAt).getTime() <= now.getTime());
}

function durationSince(startedAt: string, now: Date): number {
  const started = new Date(startedAt).getTime();
  if (Number.isNaN(started)) return 0;
  return Math.max(0, Math.floor((now.getTime() - started) / 1_000));
}

export function createApp(dependencies: AppDependencies): Hono<ApiEnv> {
  const repository = dependencies.repository;
  const now = dependencies.now ?? (() => new Date());
  const createId = dependencies.createId ?? newId;
  const createToken = dependencies.createSessionToken ?? newSessionToken;
  const ttlSeconds = dependencies.sessionTtlSeconds ?? SESSION_TTL_SECONDS;
  const sessionCreationRateLimiter = dependencies.sessionCreationRateLimiter ?? new FixedWindowRateLimiter();
  const questions = normaliseQuestions(dependencies.questions);
  const questionsById = new Map(questions.map((question) => [question.id, question]));

  const app = new Hono<ApiEnv>();
  const setSessionCookie = (c: ApiContext, token: string) => {
    setCookie(c, SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: isProductionRequest(c),
      sameSite: "Lax",
      path: "/",
      maxAge: ttlSeconds
    });
  };
  const clearSessionCookie = (c: ApiContext) => {
    setCookie(c, SESSION_COOKIE_NAME, "", {
      httpOnly: true,
      secure: isProductionRequest(c),
      sameSite: "Lax",
      path: "/",
      maxAge: 0
    });
  };
  app.use("/api/*", async (c, next) => {
    c.header("Cache-Control", "no-store");
    c.header("X-Content-Type-Options", "nosniff");
    c.header("Referrer-Policy", "same-origin");
    await next();
  });

  const requireTrustedOrigin: MiddlewareHandler<ApiEnv> = async (c, next) => {
    if (!hasTrustedOrigin(c)) {
      return errorResponse(c, 403, "untrusted_origin", "This write request must come from this application.");
    }
    await next();
  };

  const requireAuth: MiddlewareHandler<ApiEnv> = async (c, next) => {
    const token = readCookie(c.req.raw, SESSION_COOKIE_NAME);
    if (!token) {
      return errorResponse(c, 401, "authentication_required", "Start an anonymous session before accessing learner data.");
    }

    const requestTime = now();
    const requestTimeIso = requestTime.toISOString();
    await repository.purgeExpiredSessions(requestTimeIso);
    const auth = await repository.findAuthenticatedSession(await hashSessionToken(token), requestTimeIso);
    if (!auth) {
      return errorResponse(c, 401, "invalid_session", "Your session has expired. Start a new anonymous session.");
    }
    c.set("auth", auth);
    await next();
  };

  app.get("/api/v1/health", (c) =>
    c.json({ status: "ok", service: "interview-architect-api", timestamp: now().toISOString() })
  );

  app.post("/api/v1/session/anonymous", requireTrustedOrigin, async (c) => {
    const requestTime = now();
    const requestTimeIso = requestTime.toISOString();
    await repository.purgeExpiredSessions(requestTimeIso);
    const existingToken = readCookie(c.req.raw, SESSION_COOKIE_NAME);
    if (existingToken) {
      const existing = await repository.findAuthenticatedSession(
        await hashSessionToken(existingToken),
        requestTimeIso
      );
      if (existing) {
        const expiresAt = new Date(requestTime.getTime() + ttlSeconds * 1_000).toISOString();
        await repository.refreshSessionExpiry(existing.session.tokenHash, expiresAt);
        existing.session.expiresAt = expiresAt;
        setSessionCookie(c, existingToken);
        return c.json(publicSession(existing));
      }
    }

    const clientAddress = cloudflareClientAddress(c.req.raw);
    if (clientAddress) {
      const limit = sessionCreationRateLimiter.consume(`anonymous-session:${clientAddress}`, requestTime);
      c.header("X-RateLimit-Limit", String(limit.limit));
      c.header("X-RateLimit-Remaining", String(limit.remaining));
      if (!limit.allowed) {
        c.header("Retry-After", String(limit.retryAfterSeconds));
        return errorResponse(
          c,
          429,
          "rate_limited",
          "Too many anonymous sessions were started from this network. Please try again shortly."
        );
      }
    }

    const createdAt = requestTime;
    const expiresAt = new Date(createdAt.getTime() + ttlSeconds * 1_000);
    const token = createToken();
    const auth: AuthenticatedSession = {
      user: { id: createId(), createdAt: createdAt.toISOString() },
      session: {
        id: createId(),
        userId: "",
        tokenHash: await hashSessionToken(token),
        createdAt: createdAt.toISOString(),
        expiresAt: expiresAt.toISOString()
      }
    };
    auth.session.userId = auth.user.id;
    await repository.createAnonymousSession(auth);

    setSessionCookie(c, token);
    return c.json(publicSession(auth), 201);
  });

  app.get("/api/v1/me", requireAuth, (c) => c.json(publicSession(c.get("auth"))));

  app.delete("/api/v1/me", requireTrustedOrigin, requireAuth, async (c) => {
    await repository.deleteUser(c.get("auth").user.id);
    clearSessionCookie(c);
    // The only user-created answer text is local browser data. Ask supporting
    // browsers to remove it together with the server-side learner record.
    c.header("Clear-Site-Data", '"storage"');
    return c.json({ deleted: true });
  });

  app.get("/api/v1/progress", requireAuth, async (c) => {
    const userId = c.get("auth").user.id;
    const [attempts, bookmarks, mastery] = await Promise.all([
      repository.listAttempts(userId),
      repository.listBookmarks(userId),
      repository.listMastery(userId)
    ]);
    const currentTime = now();
    const response: ProgressResponse = {
      attempts,
      bookmarks,
      mastery,
      summary: {
        completedAttempts: attempts.filter((attempt) => attempt.status === "completed").length,
        bookmarkedQuestions: bookmarks.length,
        reviewDue: mastery.filter((item) => isReviewDue(item, currentTime)).length,
        topicsPracticed: mastery.filter((item) => item.attemptsCount > 0).length
      }
    };
    return c.json(response);
  });

  app.post("/api/v1/attempts", requireTrustedOrigin, requireAuth, async (c) => {
    const parsed = await parseJson(c, attemptCreateSchema);
    if (!parsed.success) return parsed.response;

    const question = questionsById.get(parsed.data.questionId);
    if (!question) return errorResponse(c, 404, "question_not_found", "That question is not available.");
    if (parsed.data.questionVersion && parsed.data.questionVersion !== question.version) {
      return errorResponse(c, 409, "question_version_conflict", "Refresh the question before starting a new attempt.");
    }

    const started = await repository.findOrCreateInProgressAttempt({
      id: createId(),
      userId: c.get("auth").user.id,
      questionId: question.id,
      questionVersion: question.version,
      startedAt: now().toISOString()
    });
    return c.json({ attempt: started.attempt }, started.created ? 201 : 200);
  });

  app.patch("/api/v1/attempts/:attemptId", requireTrustedOrigin, requireAuth, async (c) => {
    const attemptId = parseRouteId(c.req.param("attemptId"));
    if (!attemptId) return errorResponse(c, 404, "attempt_not_found", "That attempt does not exist.");

    const parsed = await parseJson(c, attemptPatchSchema);
    if (!parsed.success) return parsed.response;

    const userId = c.get("auth").user.id;
    const current = await repository.getAttempt(userId, attemptId);
    if (!current) return errorResponse(c, 404, "attempt_not_found", "That attempt does not exist.");
    if (current.status !== "in_progress") {
      return errorResponse(c, 409, "attempt_already_finished", "This attempt has already been finished.");
    }

    const question = questionsById.get(current.questionId);
    if (!question) {
      return errorResponse(c, 409, "question_unavailable", "This question is no longer available for scoring.");
    }
    if (parsed.data.rubricScores) {
      const validDimensions = new Set(question.rubric.map((item) => item.dimension));
      const invalidDimension = Object.keys(parsed.data.rubricScores).find(
        (dimension) => !validDimensions.has(dimension)
      );
      if (invalidDimension) {
        return errorResponse(c, 422, "validation_error", "A rubric score does not match this question.", {
          dimension: invalidDimension
        });
      }
    }

    const completedAt = now();
    const updated = await repository.updateAttempt(userId, attemptId, {
      status: parsed.data.status,
      completedAt: completedAt.toISOString(),
      durationSeconds: parsed.data.durationSeconds ?? durationSince(current.startedAt, completedAt),
      ...(parsed.data.selfScore === undefined ? {} : { selfScore: parsed.data.selfScore }),
      ...(parsed.data.rubricScores === undefined ? {} : { rubricScores: parsed.data.rubricScores })
    });
    if (!updated) {
      return errorResponse(c, 409, "attempt_already_finished", "This attempt has already been finished.");
    }

    if (updated.status !== "completed" || updated.selfScore === undefined || !updated.completedAt) {
      return c.json({ attempt: updated });
    }

    const mastery = await refreshTopicMastery({
      repository,
      userId,
      topicId: question.primaryTopicId,
      questionsById,
      now: completedAt
    });
    return c.json({ attempt: updated, ...(mastery ? { mastery } : {}) });
  });

  app.get("/api/v1/bookmarks", requireAuth, async (c) => {
    return c.json({ bookmarks: await repository.listBookmarks(c.get("auth").user.id) });
  });

  app.put("/api/v1/bookmarks/:questionId", requireTrustedOrigin, requireAuth, async (c) => {
    const questionId = parseRouteId(c.req.param("questionId"));
    if (!questionId || !questionsById.has(questionId)) {
      return errorResponse(c, 404, "question_not_found", "That question is not available.");
    }
    const parsed = await parseJson(c, bookmarkSchema);
    if (!parsed.success) return parsed.response;
    await repository.setBookmark(c.get("auth").user.id, questionId, parsed.data.bookmarked, now().toISOString());
    return c.json({ questionId, bookmarked: parsed.data.bookmarked });
  });

  app.get("/api/v1/review-queue", requireAuth, async (c) => {
    const userId = c.get("auth").user.id;
    const currentTime = now();
    const [mastery, attempts] = await Promise.all([
      repository.listMastery(userId),
      repository.listAttempts(userId)
    ]);
    const completedIds = new Set(
      attempts.filter((attempt) => attempt.status === "completed").map((attempt) => attempt.questionId)
    );
    const items: ReviewQueueItem[] = mastery
      .filter((item) => isReviewDue(item, currentTime))
      .sort((left, right) => (left.nextReviewAt ?? "").localeCompare(right.nextReviewAt ?? ""))
      .flatMap((item) => {
        const topicQuestions = questions.filter((question) => question.primaryTopicId === item.topicId);
        const question = topicQuestions.find((candidate) => !completedIds.has(candidate.id)) ?? topicQuestions[0];
        return question ? [{ question, mastery: item }] : [];
      });
    return c.json({ items });
  });

  app.post("/api/v1/coach/next", requireTrustedOrigin, requireAuth, async (c) => {
    const parsed = await parseJson(c, coachSchema);
    if (!parsed.success) return parsed.response;
    const userId = c.get("auth").user.id;
    const [attempts, bookmarks, mastery] = await Promise.all([
      repository.listAttempts(userId),
      repository.listBookmarks(userId),
      repository.listMastery(userId)
    ]);
    const progress: LearnerProgress = { userId, attempts, bookmarks, mastery };
    const recommendation = recommendNextQuestion(questions, progress, parsed.data as CoachRequest, now());
    return c.json({ recommendation: recommendation ?? null });
  });

  app.notFound((c) => errorResponse(c, 404, "not_found", "The requested API route was not found."));
  app.onError((_error, c) =>
    errorResponse(c, 500, "internal_error", "The study service could not complete that request.")
  );
  return app;
}

async function refreshTopicMastery(input: {
  repository: LearnerRepository;
  userId: string;
  topicId: string;
  questionsById: ReadonlyMap<string, InterviewQuestion>;
  now: Date;
}): Promise<TopicMastery | undefined> {
  const relevantCompleted = (await input.repository.listAttempts(input.userId))
    .filter((attempt) => input.questionsById.get(attempt.questionId)?.primaryTopicId === input.topicId)
    .filter((attempt) => attempt.status === "completed" && typeof attempt.selfScore === "number")
    .sort((left, right) => left.completedAt?.localeCompare(right.completedAt ?? "") ?? 0);
  const latest = relevantCompleted.at(-1);
  if (!latest || latest.selfScore === undefined || !latest.completedAt) return undefined;

  const mastery: TopicMastery = {
    userId: input.userId,
    topicId: input.topicId,
    masteryScore: calculateMastery(relevantCompleted),
    confidence: latest.selfScore,
    attemptsCount: relevantCompleted.length,
    lastPracticedAt: latest.completedAt,
    nextReviewAt: nextReviewAt(latest.selfScore, new Date(latest.completedAt))
  };
  await input.repository.upsertMastery(mastery);
  return mastery;
}
