import { questions } from "@interview-architect/content";
import { createApp } from "./app";
import { FixedWindowRateLimiter } from "./lib/rate-limit";
import { D1LearnerRepository } from "./repository/d1-repository";
import type { WorkerBindings } from "./types";

// Worker isolates retain module state between requests. This is intentionally a
// best-effort burst limiter, not a distributed quota.
const sessionCreationRateLimiter = new FixedWindowRateLimiter();

export default {
  fetch(request: Request, env: WorkerBindings, executionContext: ExecutionContext): Response | Promise<Response> {
    if (!env.DB) {
      return new Response(JSON.stringify({ error: { code: "database_unavailable", message: "D1 is not bound." } }), {
        status: 500,
        headers: { "content-type": "application/json", "cache-control": "no-store" }
      });
    }

    return createApp({
      repository: new D1LearnerRepository(env.DB),
      questions,
      sessionCreationRateLimiter
    }).fetch(request, env, executionContext);
  }
} satisfies ExportedHandler<WorkerBindings>;
