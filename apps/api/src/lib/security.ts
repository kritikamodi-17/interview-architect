import type { WorkerBindings } from "../types";

export const SESSION_COOKIE_NAME = "ia_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

export function newId(): string {
  return crypto.randomUUID();
}

/** 244 bits of URL-safe entropy; only its SHA-256 digest is persisted. */
export function newSessionToken(): string {
  return `${crypto.randomUUID()}${crypto.randomUUID()}`.replaceAll("-", "");
}

export async function hashSessionToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function readCookie(request: Request, name: string): string | undefined {
  const header = request.headers.get("Cookie");
  if (!header) return undefined;

  for (const part of header.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 1) continue;
    if (part.slice(0, separator).trim() !== name) continue;
    try {
      return decodeURIComponent(part.slice(separator + 1).trim());
    } catch {
      return undefined;
    }
  }
  return undefined;
}

interface SecurityContext {
  env?: WorkerBindings;
  req: {
    url: string;
    header(name: string): string | undefined;
  };
}

export function isProductionRequest(c: SecurityContext): boolean {
  return c.env?.ENVIRONMENT === "production" || new URL(c.req.url).protocol === "https:";
}

/**
 * Mutation requests must originate from the same app. In local development the
 * Vite proxy runs on a different localhost port, which is kept as a narrowly
 * scoped exception; production always requires the configured/same origin.
 */
export function hasTrustedOrigin(c: SecurityContext): boolean {
  const origin = c.req.header("Origin");
  if (!origin) return false;

  let parsedOrigin: URL;
  let requestUrl: URL;
  try {
    parsedOrigin = new URL(origin);
    requestUrl = new URL(c.req.url);
  } catch {
    return false;
  }

  const configuredOrigin = c.env?.ALLOWED_ORIGIN?.replace(/\/$/, "");
  if (configuredOrigin) return origin === configuredOrigin;
  if (origin === requestUrl.origin) return true;

  if (isProductionRequest(c)) return false;

  const localHostnames = new Set(["localhost", "127.0.0.1", "[::1]"]);
  return (
    localHostnames.has(parsedOrigin.hostname) &&
    localHostnames.has(requestUrl.hostname) &&
    parsedOrigin.protocol === "http:" &&
    requestUrl.protocol === "http:"
  );
}
