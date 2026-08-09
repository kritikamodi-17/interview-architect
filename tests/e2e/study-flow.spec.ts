import { expect, test } from "@playwright/test";

test("learner can search, complete a rubric-scored prompt, and retain progress after reload", async ({ page }) => {
  await page.goto("/questions");

  await expect(page.getByRole("heading", { name: /questions to explore/i })).toBeVisible();
  await expect(page.locator(".sync-pill")).toContainText("Synced", { timeout: 15_000 });
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
  await page.getByRole("button", { name: /reveal answer & rubric/i }).click();

  // Score cards are labels, so exercise their visible interactive surface
  // instead of the visually hidden radio input itself.
  await page.locator('label:has(input[name="Problem framing"][value="3"])').click();
  await page.locator('label:has(input[name="Technical design"][value="3"])').click();
  await page.locator('label:has(input[name="Failure handling & verification"][value="3"])').click();
  await page.locator('label:has(input[name="self-score"][value="3"])').click();
  await page.getByRole("button", { name: /save review & update progress/i }).click();

  await expect(page.getByRole("status")).toContainText(/review saved/i);
  await page.reload();

  await page.getByRole("link", { name: "My progress" }).first().click();
  await expect(page.getByRole("heading", { name: "Progress is a trail of better decisions." })).toBeVisible();
  await expect(page.locator(".progress-hero__main").getByText(/1 of \d+ prompts practiced/)).toBeVisible();

  await page.getByRole("button", { name: "Erase study data" }).click();
  await expect(page.getByText("Erase all study data?")).toBeVisible();
  await page.getByRole("button", { name: "Yes, erase study data" }).click();

  await expect(page.getByRole("status").filter({ hasText: "Your study data has been erased." })).toBeVisible();
  await expect(page.locator(".progress-hero__main").getByText(/0 of \d+ prompts practiced/)).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.localStorage.getItem("interview-architect:learner:v1"))).toBeNull();

  await page.reload();
  await expect(page.locator(".progress-hero__main").getByText(/0 of \d+ prompts practiced/)).toBeVisible();
});
