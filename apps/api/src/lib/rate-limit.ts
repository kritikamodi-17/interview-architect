/**
 * A deliberately small, best-effort limiter for a single Worker isolate.
 *
 * It is not a distributed quota (that would require Durable Objects, KV, or a
 * similar shared service), but it reliably absorbs short bursts that reach the
 * same isolate without retaining client identifiers indefinitely.
 */
export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
}

export interface RateLimiter {
  consume(key: string, now: Date): RateLimitResult;
}

interface WindowRecord {
  count: number;
  resetAt: number;
}

export interface FixedWindowRateLimiterOptions {
  limit?: number;
  windowMs?: number;
  maxEntries?: number;
}

/** A bounded fixed-window limiter suitable for module-scoped Worker state. */
export class FixedWindowRateLimiter implements RateLimiter {
  private readonly records = new Map<string, WindowRecord>();
  private readonly limit: number;
  private readonly windowMs: number;
  private readonly maxEntries: number;

  constructor(options: FixedWindowRateLimiterOptions = {}) {
    this.limit = options.limit ?? 12;
    this.windowMs = options.windowMs ?? 10 * 60 * 1_000;
    this.maxEntries = options.maxEntries ?? 5_000;
  }

  consume(key: string, now: Date): RateLimitResult {
    const timestamp = now.getTime();
    this.prune(timestamp);

    let record = this.records.get(key);
    if (!record || record.resetAt <= timestamp) {
      record = {
        count: 0,
        resetAt: Math.floor(timestamp / this.windowMs + 1) * this.windowMs
      };
      this.records.set(key, record);
    }

    record.count += 1;
    const retryAfterSeconds = Math.max(1, Math.ceil((record.resetAt - timestamp) / 1_000));
    const allowed = record.count <= this.limit;
    return {
      allowed,
      limit: this.limit,
      remaining: Math.max(0, this.limit - record.count),
      retryAfterSeconds
    };
  }

  private prune(timestamp: number): void {
    for (const [key, record] of this.records) {
      if (record.resetAt <= timestamp) this.records.delete(key);
    }

    if (this.records.size < this.maxEntries) return;

    const keysToEvict = this.records.size - this.maxEntries + 1;
    const oldest = [...this.records.entries()]
      .sort(([, left], [, right]) => left.resetAt - right.resetAt)
      .slice(0, keysToEvict);
    for (const [key] of oldest) this.records.delete(key);
  }
}

/**
 * CF-Connecting-IP is supplied by Cloudflare at the edge. Do not rate limit
 * requests without it: a shared fallback key would let one local/proxied user
 * block unrelated users.
 */
export function cloudflareClientAddress(request: Request): string | undefined {
  const value = request.headers.get("CF-Connecting-IP")?.trim();
  if (!value || value.length > 64) return undefined;
  return /^[0-9a-fA-F:.]+$/.test(value) ? value : undefined;
}
