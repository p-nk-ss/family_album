import { test, expect } from "@playwright/test"

test("unauthenticated /upload redirects to /signin and shows sign-in button", async ({ page }) => {
  await page.goto("/upload")
  await expect(page).toHaveURL(/\/signin/)
  await expect(page.getByRole("button", { name: /sign in with google/i })).toBeVisible()
})
