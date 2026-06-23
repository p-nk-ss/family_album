import { test, expect } from "@playwright/test"
import path from "node:path"

// Skipped: pending valid R2 credentials in .env (R2_* malformed); unskip once fixed
test.skip("uploaded photo appears in the gallery", async ({ page }) => {
  await page.goto("/upload")
  await page.setInputFiles('input[type="file"]', path.join(__dirname, "../fixtures/sample.jpg"))
  await page.getByRole("button", { name: /upload/i }).click()
  await expect(page.getByTestId("upload-done")).toBeVisible({ timeout: 15000 })

  await page.goto("/library")
  await expect(page.getByTestId("photo-grid").locator("img").first()).toBeVisible()
})
