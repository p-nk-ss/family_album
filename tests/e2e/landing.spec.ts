import { test, expect } from "@playwright/test"

test("landing page renders the family mark", async ({ page }) => {
  const res = await page.goto("/")
  expect(res?.status()).toBe(200)
  await expect(page.getByRole("heading", { name: /family albums/i })).toBeVisible()
})
