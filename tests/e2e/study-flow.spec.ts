import { expect, test, type Page } from "@playwright/test";

const cacheStampedeSlug = "prevent-cache-stampede-on-expensive-profile";
const cacheStampedePath = `/questions/${cacheStampedeSlug}`;
const cacheStampedeTitle = "Prevent a cache stampede on an expensive profile endpoint";

async function waitForSync(page: Page): Promise<void> {
  await expect(page.locator(".sync-pill")).toContainText("Synced", { timeout: 15_000 });
}

async function startStudioSession(page: Page, mode: "learn" | "mock"): Promise<void> {
  await page.goto(`${cacheStampedePath}?mode=${mode}`);
  await waitForSync(page);
  await page.getByRole("button", { name: `Start ${mode === "learn" ? "Learn" : "Mock"} session`, exact: true }).click();
  await expect(page.getByRole("button", { name: "Discard session", exact: true })).toBeVisible();
}

async function scoreCacheStampede(page: Page, score = 3): Promise<void> {
  await page.locator(`label:has(input[name="Problem framing"][value="${score}"])`).click();
  await page.locator(`label:has(input[name="Technical design"][value="${score}"])`).click();
  await page.locator(`label:has(input[name="Failure handling & verification"][value="${score}"])`).click();
  await page.locator(`label:has(input[name="self-score"][value="${score}"])`).click();
}

test("learner can search, complete a rubric-scored prompt, and retain progress after reload", async ({ page }) => {
  await page.goto("/questions");

  await expect(page.getByRole("heading", { name: /questions to explore/i })).toBeVisible();
  await waitForSync(page);
  await page.getByLabel("Search questions").fill("cache stampede");

  const questionLink = page.getByRole("link", {
    name: "Prevent a cache stampede on an expensive profile endpoint",
    exact: true
  });
  await expect(questionLink).toBeVisible();
  await questionLink.click();

  await expect(
    page.getByRole("heading", { name: "Prevent a cache stampede on an expensive profile endpoint" })
  ).toBeVisible();
  await page.getByRole("button", { name: "Start Learn session", exact: true }).click();
  await page.getByRole("button", { name: /reveal answer & rubric/i }).click();

  // Score cards are labels, so exercise their visible interactive surface
  // instead of the visually hidden radio input itself.
  await scoreCacheStampede(page);
  await page.getByRole("button", { name: /complete session & update progress/i }).click();

  await expect(page.getByRole("status").filter({ hasText: /review saved/i })).toBeVisible();
  await page.reload();

  await page.getByRole("link", { name: "My progress" }).first().click();
  await expect(page.getByRole("heading", { name: "Progress is a trail of better decisions." })).toBeVisible();
  await expect(page.locator(".progress-hero__main").getByText(/1 of \d+ prompts practiced/)).toBeVisible();

  await page.evaluate(() => {
    window.localStorage.setItem("interview-architect:draft:legacy-e2e", "private legacy note");
    window.localStorage.setItem("interview-architect:studio:v1:staging:private", "private staging note");
    window.localStorage.setItem("interview-architect:studio:v1:attempt:private", "private attempt note");
    window.localStorage.setItem("interview-architect:studio:v1:completion:private", "private completion envelope");
  });

  await page.getByRole("button", { name: "Erase study data" }).click();
  await expect(page.getByText("Erase all study data?")).toBeVisible();
  await page.getByRole("button", { name: "Yes, erase study data" }).click();

  await expect(page.getByRole("status").filter({ hasText: "Your study data has been erased." })).toBeVisible();
  await expect(page.locator(".progress-hero__main").getByText(/0 of \d+ prompts practiced/)).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.localStorage.getItem("interview-architect:learner:v1"))).toBeNull();
  await expect.poll(() => page.evaluate(() => Object.keys(window.localStorage)
    .filter((key) => key.startsWith("interview-architect:")))).toEqual([]);

  await page.reload();
  await expect(page.locator(".progress-hero__main").getByText(/0 of \d+ prompts practiced/)).toBeVisible();
});

test("question-bank launch choices retain filters and offer a dashboard resume", async ({ page }) => {
  const title = cacheStampedeTitle;

  await page.goto("/questions?q=cache+stampede&status=fresh");
  await waitForSync(page);

  const card = page.locator(".question-card").filter({ hasText: title });
  await expect(card).toBeVisible();
  await card.getByRole("link", { name: `Start a Mock session for ${title}` }).click();

  await expect(page).toHaveURL(/\/questions\/prevent-cache-stampede-on-expensive-profile\?mode=mock&from=/);
  await page.getByRole("button", { name: "Start Mock session", exact: true }).click();
  await expect(page.getByRole("button", { name: "Discard session", exact: true })).toBeVisible();

  await page.goto(`${cacheStampedePath}?mode=learn&from=${encodeURIComponent("/questions?q=cache+stampede&status=fresh")}`);
  await expect(page.locator(".studio-mode-badge--mock")).toHaveText("Mock");
  await expect(page.getByRole("status").filter({ hasText: "saved mode takes priority" })).toBeVisible();

  await page.getByLabel("Breadcrumb").getByRole("link", { name: "Question bank", exact: true }).click();
  await expect(page).toHaveURL(/\/questions\?q=cache\+stampede&status=fresh/);
  await expect(card.getByRole("link", { name: `Resume Mock session for ${title}` })).toBeVisible();

  await page.goto("/");
  await expect(page.getByRole("link", { name: `Resume Mock session for ${title}` })).toBeVisible();
});

test("question-bank Learn and Mock choices remain touch-friendly on mobile", async ({ page }) => {
  const title = cacheStampedeTitle;
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/questions?q=cache+stampede");
  await waitForSync(page);

  const card = page.locator(".question-card").filter({ hasText: title });
  const learn = card.getByRole("link", { name: `Start a Learn session for ${title}` });
  const mock = card.getByRole("link", { name: `Start a Mock session for ${title}` });
  await expect(learn).toBeVisible();
  await expect(mock).toBeVisible();

  const [learnBox, mockBox] = await Promise.all([learn.boundingBox(), mock.boundingBox()]);
  expect(learnBox?.height).toBeGreaterThanOrEqual(44);
  expect(mockBox?.height).toBeGreaterThanOrEqual(44);
});

test("Learn autosaves workspace and probe responses across reload while keyboard shortcuts respect typing", async ({ page }) => {
  await startStudioSession(page, "learn");
  const architecture = page.locator("#workspace-architecture");
  const draft = "Use a lease and bounded stale reads to protect the source of truth.";

  await page.getByRole("button", { name: "Pause timer", exact: true }).focus();
  await page.keyboard.press("h");
  await expect(page.getByText("Separate fresh data from acceptable stale data.")).toBeVisible();

  await architecture.fill(draft);
  await architecture.press("h");
  await expect(architecture).toHaveValue(`${draft}h`);
  await expect(page.locator(".hint-list li")).toHaveCount(1);

  await page.getByRole("button", { name: "Pause timer", exact: true }).focus();
  await page.keyboard.press("b");
  await expect(page.getByRole("button", { name: "Remove from saved prompts" })).toBeVisible();

  await page.getByRole("button", { name: "Ask follow-up 1 of 2" }).click();
  await page.locator("#probe-response-0").fill("I would use fencing tokens so a paused lease holder cannot overwrite a newer refresh.");
  await expect(page.locator(".workspace-save-state")).toContainText("Saved privately on this device", { timeout: 10_000 });

  await page.reload();
  await waitForSync(page);
  await expect(page.locator("#workspace-architecture")).toHaveValue(`${draft}h`);
  await expect(page.locator("#probe-response-0")).toHaveValue("I would use fencing tokens so a paused lease holder cannot overwrite a newer refresh.");
  await expect(page.locator(".hint-list li")).toHaveCount(1);
});

test("completed private notes reopen on reload and from their recent-attempt link", async ({ page }) => {
  await startStudioSession(page, "learn");
  const draft = "Use a single-flight lease with a bounded stale response and fencing tokens for refresh ownership.";
  const probeResponse = "A versioned lease token prevents an old refresher from overwriting the current value.";

  await page.getByLabel("Architecture").fill(draft);
  await page.getByRole("button", { name: "Ask follow-up 1 of 2" }).click();
  await page.locator("#probe-response-0").fill(probeResponse);
  await expect(page.locator(".workspace-save-state")).toContainText("Saved privately on this device", { timeout: 10_000 });

  await page.getByRole("button", { name: /reveal answer & rubric/i }).click();
  await scoreCacheStampede(page);
  await page.getByRole("button", { name: /complete session & update progress/i }).click();
  await expect(page.getByRole("status").filter({ hasText: "Review saved—nice work." })).toBeVisible();

  await page.reload();
  await waitForSync(page);
  await expect(page.getByLabel("Architecture")).toHaveValue(draft);
  await expect(page.locator("#probe-response-0")).toHaveValue(probeResponse);
  await expect(page.getByLabel("Architecture")).toHaveAttribute("readonly", "");
  await expect(page.getByRole("heading", { name: "Your next improvement is visible now" })).toBeVisible();

  await page.getByRole("link", { name: "My progress" }).first().click();
  const recentAttempt = page.locator(".attempt-table__row").filter({ hasText: cacheStampedeTitle });
  await expect(recentAttempt).toBeVisible();
  await recentAttempt.click();
  await expect(page).toHaveURL(/\/questions\/prevent-cache-stampede-on-expensive-profile\?mode=learn&attempt=/);
  await expect(page.getByLabel("Architecture")).toHaveValue(draft);
  await expect(page.locator("#probe-response-0")).toHaveValue(probeResponse);
});

test("retains private notes when the discard request cannot be confirmed", async ({ page }) => {
  await startStudioSession(page, "learn");
  const draft = "Keep this private design note until the discard result is confirmed.";
  await page.getByLabel("Architecture").fill(draft);
  await expect(page.locator(".workspace-save-state")).toContainText("Saved privately on this device", { timeout: 10_000 });

  await page.route("**/api/v1/attempts/*", async (route) => {
    if (route.request().method() === "PATCH") {
      await route.abort("connectionreset");
      return;
    }
    await route.continue();
  });

  await page.getByRole("button", { name: "Discard session", exact: true }).click();
  await page.getByRole("button", { name: "Yes, discard session", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("We could not confirm the discard");
  await expect(page.getByLabel("Architecture")).toHaveValue(draft);
  await expect(page.getByRole("button", { name: "Discard session", exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => Object.keys(window.localStorage)
    .some((key) => key.startsWith("interview-architect:studio:v1:attempt:")))).toBe(true);

  await page.unroute("**/api/v1/attempts/*");
  await page.reload();
  await waitForSync(page);
  await expect(page.getByLabel("Architecture")).toHaveValue(draft);
  await expect(page.getByRole("button", { name: "Discard session", exact: true })).toBeVisible();
});

test("Mock keeps coaching hidden, gates interviewer probes, and unlocks feedback only after completion", async ({ page }) => {
  await startStudioSession(page, "mock");

  await expect(page.getByRole("heading", { name: "Get unstuck without skipping the work" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "A strong path through the problem" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Open self-review" })).toBeVisible();

  await page.getByRole("button", { name: "Ask follow-up 1 of 2" }).click();
  const secondProbe = page.getByRole("button", { name: "Ask follow-up 2 of 2" });
  await expect(secondProbe).toBeDisabled();
  await page.locator("#probe-response-0").fill("I would keep serving bounded stale data while one fenced refresh owns the lease.");
  await expect(secondProbe).toBeEnabled();

  await page.getByRole("button", { name: "Open self-review" }).click();
  await expect(page.getByText("Use your own evidence first; score guidance unlocks after submission.").first()).toBeVisible();
  await expect(page.locator(".rubric-score__prompt")).toHaveCount(0);
  await scoreCacheStampede(page);
  await page.getByRole("button", { name: /complete session & update progress/i }).click();

  await expect(page.getByRole("heading", { name: "A strong path through the problem" })).toBeVisible();
  await expect(page.getByText("Unlocked after mock")).toBeVisible();
  await expect(page.locator(".rubric-score__prompt")).toHaveCount(3);
});

test("replays a completion after the server accepts it but the browser loses the response", async ({ page }) => {
  await startStudioSession(page, "learn");
  await page.getByRole("button", { name: /reveal answer & rubric/i }).click();
  await scoreCacheStampede(page);

  let lostResponse = false;
  await page.route("**/api/v1/attempts/*", async (route) => {
    if (!lostResponse && route.request().method() === "PATCH") {
      lostResponse = true;
      await route.fetch();
      await route.abort("connectionreset");
      return;
    }
    await route.continue();
  });

  await page.getByRole("button", { name: /complete session & update progress/i }).click();
  await expect(page.getByRole("status").filter({ hasText: "sync still needs a retry" })).toBeVisible();
  await expect.poll(() => page.evaluate(() => Object.keys(window.localStorage)
    .some((key) => key.startsWith("interview-architect:studio:v1:completion:")))).toBe(true);

  await page.reload();
  await waitForSync(page);
  await expect(page.getByRole("button", { name: "Retry completion sync" })).toBeVisible();
  await page.getByRole("button", { name: "Retry completion sync" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Review saved—nice work." })).toBeVisible();
  await expect.poll(() => page.evaluate(() => Object.keys(window.localStorage)
    .some((key) => key.startsWith("interview-architect:studio:v1:completion:")))).toBe(false);
});

test("the mobile Studio remains usable without horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await startStudioSession(page, "mock");

  const discard = page.getByRole("button", { name: "Discard session", exact: true });
  await expect(discard).toBeVisible();
  expect((await discard.boundingBox())?.height).toBeGreaterThanOrEqual(44);
  await page.getByLabel("Architecture").fill("A small, bounded cache refresh path with a fenced lease.");
  await page.getByRole("button", { name: "Ask follow-up 1 of 2" }).click();
  await expect(page.locator("#probe-response-0")).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("Studio root honors reduced-motion preferences", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(`${cacheStampedePath}?mode=learn`);
  const studio = page.locator(".design-studio");
  await expect(studio).toBeVisible();
  const animationDurationMs = await studio.evaluate((element) => {
    const duration = window.getComputedStyle(element).animationDuration;
    const value = Number.parseFloat(duration);
    return duration.endsWith("ms") ? value : value * 1_000;
  });
  expect(animationDurationMs).toBeLessThanOrEqual(0.01);
});
