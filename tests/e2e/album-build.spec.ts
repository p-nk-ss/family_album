import { test, expect } from "@playwright/test"

// pending authenticated storageState (Google login deferred)
// Once Phase 3 auth is live and a Playwright storageState exists for a signed-in
// member, remove test.skip and wire the storageState in playwright.config.ts.
test.skip("create an album and see it in the library", async ({ page }) => {
  await page.goto("/albums/new")
  await page.fill('input[name="title"]', "E2E Album")
  await page.fill('textarea[name="description"]', "A test story")
  await page.getByRole("button", { name: /create/i }).click()
  await expect(page).toHaveURL(/\/albums\/.+\/edit/)
  await page.goto("/library")
  await expect(page.getByText("E2E Album")).toBeVisible()
})
