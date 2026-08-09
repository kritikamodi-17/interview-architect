import type { PracticeMode } from "@interview-architect/domain";

const LOCAL_ORIGIN = "https://interview-architect.local";

export function practiceModeLabel(mode: PracticeMode): "Learn" | "Mock" {
  return mode === "mock" ? "Mock" : "Learn";
}

/** Build a Studio URL without mutating the question-bank's URL-backed filters. */
export function practicePath(slug: string, mode: PracticeMode, returnTo?: string): string {
  const params = new URLSearchParams({ mode });
  if (returnTo) params.set("from", returnTo);
  return `/questions/${encodeURIComponent(slug)}?${params.toString()}`;
}

/**
 * Only allow a local question-bank return route. This keeps a launch link
 * reload-safe while avoiding an open redirect from a hand-edited `from` query.
 */
export function questionBankReturnPath(raw: string | null | undefined): string {
  if (!raw) return "/questions";
  try {
    const parsed = new URL(raw, LOCAL_ORIGIN);
    if (parsed.origin !== LOCAL_ORIGIN || parsed.pathname !== "/questions") return "/questions";
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return "/questions";
  }
}
