import { describe, expect, it } from "vitest";
import { practicePath, questionBankReturnPath } from "../src/lib/practice-route";

describe("practice launch routes", () => {
  it("keeps the requested mode and question-bank filters in a launch URL", () => {
    const href = practicePath(
      "prevent-cache-stampede",
      "mock",
      "/questions?q=cache+stampede&status=fresh"
    );
    const url = new URL(href, "https://interview-architect.local");

    expect(url.pathname).toBe("/questions/prevent-cache-stampede");
    expect(url.searchParams.get("mode")).toBe("mock");
    expect(url.searchParams.get("from")).toBe("/questions?q=cache+stampede&status=fresh");
  });

  it("allows only a local question-bank route as a Studio return target", () => {
    expect(questionBankReturnPath("/questions?q=redis&status=fresh")).toBe("/questions?q=redis&status=fresh");
    expect(questionBankReturnPath("https://outside.example/questions")).toBe("/questions");
    expect(questionBankReturnPath("//outside.example/questions")).toBe("/questions");
    expect(questionBankReturnPath("/questions/redis-cache-aside")).toBe("/questions");
  });
});
