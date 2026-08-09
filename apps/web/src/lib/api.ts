import type {
  CoachRecommendation,
  CoachRequest,
  PracticeMode,
  PracticeAttempt,
  TopicMastery
} from "@interview-architect/domain";

export interface ProgressPayload {
  attempts: PracticeAttempt[];
  bookmarks: string[];
  mastery: TopicMastery[];
  summary?: {
    completedAttempts: number;
    bookmarkedQuestions: number;
    reviewDue: number;
    topicsPracticed: number;
  };
}

export interface SessionPayload {
  user: { id: string; createdAt: string };
  session: { expiresAt: string };
}

export interface ReviewQueueItem {
  question: { id: string } | string;
  mastery?: TopicMastery;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly kind: "api" | "transport" = "api"
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * A request that never reached the study service (or did not receive a
 * response). These are safe to treat as offline work: the client can retain a
 * local change, while an HTTP response should be surfaced as a failed save.
 */
export class TransportError extends ApiError {
  constructor(message: string) {
    super(message, undefined, "transport");
    this.name = "TransportError";
  }
}

export function isTransportError(error: unknown): error is TransportError {
  return error instanceof ApiError && error.kind === "transport";
}

const API_ROOT = "/api/v1";
const REQUEST_TIMEOUT_MS = 7_000;

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const headers = new Headers(init.headers);
    if (init.body && !headers.has("content-type")) {
      headers.set("content-type", "application/json");
    }

    const response = await fetch(`${API_ROOT}${path}`, {
      ...init,
      headers,
      credentials: "include",
      signal: controller.signal
    });

    const raw = await response.text();
    let body: unknown = undefined;
    if (raw) {
      try {
        body = JSON.parse(raw) as unknown;
      } catch {
        body = raw;
      }
    }

    if (!response.ok) {
      const message =
        typeof body === "object" && body !== null && "message" in body && typeof body.message === "string"
          ? body.message
          : `The study service returned ${response.status}.`;
      throw new ApiError(message, response.status);
    }

    return body as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new TransportError("The study service took too long to respond.");
    }
    throw new TransportError("The study service is unavailable.");
  } finally {
    window.clearTimeout(timeout);
  }
}

export const api = {
  createAnonymousSession(): Promise<SessionPayload> {
    return request<SessionPayload>("/session/anonymous", { method: "POST", body: "{}" });
  },

  getProgress(): Promise<ProgressPayload> {
    return request<ProgressPayload>("/progress");
  },

  deleteMe(): Promise<{ deleted: true }> {
    return request<{ deleted: true }>("/me", { method: "DELETE" });
  },

  startAttempt(
    questionId: string,
    questionVersion: number,
    mode: PracticeMode = "learn"
  ): Promise<{ attempt: PracticeAttempt }> {
    return request<{ attempt: PracticeAttempt }>("/attempts", {
      method: "POST",
      body: JSON.stringify({ questionId, questionVersion, mode })
    });
  },

  completeAttempt(
    attemptId: string,
    input: {
      status: "completed" | "abandoned";
      durationSeconds?: number;
      selfScore?: number;
      rubricScores?: Record<string, number>;
    },
    idempotencyKey?: string
  ): Promise<{ attempt: PracticeAttempt; mastery?: TopicMastery }> {
    return request<{ attempt: PracticeAttempt; mastery?: TopicMastery }>(`/attempts/${encodeURIComponent(attemptId)}`, {
      method: "PATCH",
      headers:
        input.status === "completed"
          ? { "Idempotency-Key": idempotencyKey ?? crypto.randomUUID() }
          : undefined,
      body: JSON.stringify(input)
    });
  },

  setBookmark(questionId: string, bookmarked: boolean): Promise<{ questionId: string; bookmarked: boolean }> {
    return request<{ questionId: string; bookmarked: boolean }>(
      `/bookmarks/${encodeURIComponent(questionId)}`,
      { method: "PUT", body: JSON.stringify({ bookmarked }) }
    );
  },

  getReviewQueue(): Promise<{ items: ReviewQueueItem[] }> {
    return request<{ items: ReviewQueueItem[] }>("/review-queue");
  },

  getCoach(requestBody: CoachRequest): Promise<{ recommendation: CoachRecommendation | null }> {
    return request<{ recommendation: CoachRecommendation | null }>("/coach/next", {
      method: "POST",
      body: JSON.stringify(requestBody)
    });
  }
};
