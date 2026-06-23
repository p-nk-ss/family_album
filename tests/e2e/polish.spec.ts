import { test, expect } from "@playwright/test"

// Comment e2e requires an authenticated user with photos — deferred until login flow is tested
test.skip("adds a comment on a photo", async ({ page }) => {
  // pending authenticated storageState — login deferred
  await page.goto("/library")
  await page.locator("a[href^='/albums/']").first().click()
  await page.locator("a[href^='/photos/']").first().click()
  await page.getByPlaceholder("Add a memory…").fill("So good")
  await page.getByRole("button", { name: /post/i }).click()
  await expect(page.getByText("So good")).toBeVisible()
})

test("reduced-motion renders landing without crashing", async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: "reduce" })
  const page = await ctx.newPage()
  const res = await page.goto("/")
  expect(res?.status()).toBe(200)
  await expect(
    page.getByRole("heading", { name: /family albums/i }),
  ).toBeVisible()
  await ctx.close()
})
