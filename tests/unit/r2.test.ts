import { describe, it, expect, beforeEach, vi } from "vitest"

beforeEach(() => {
  vi.resetModules()
  process.env.R2_ACCOUNT_ID = "acct"
  process.env.R2_ACCESS_KEY_ID = "key"
  process.env.R2_SECRET_ACCESS_KEY = "secret"
  process.env.R2_BUCKET = "family-albums"
  process.env.R2_ENDPOINT = "https://acct.r2.cloudflarestorage.com"
})

describe("presignPut", () => {
  it("rejects an invalid content type before signing", async () => {
    const { presignPut } = await import("@/lib/r2")
    await expect(
      presignPut({ key: "photos/u/x.pdf", contentType: "application/pdf", contentLength: 10 })
    ).rejects.toThrow()
  })

  it("returns a signed URL for a valid PUT", async () => {
    const { presignPut } = await import("@/lib/r2")
    const url = await presignPut({
      key: "photos/u/x.jpg",
      contentType: "image/jpeg",
      contentLength: 1000,
    })
    expect(url).toContain("https://acct.r2.cloudflarestorage.com")
    expect(url).toContain("X-Amz-Signature")
  })
})

describe("presignGet", () => {
  it("returns a signed GET URL", async () => {
    const { presignGet } = await import("@/lib/r2")
    const url = await presignGet({ key: "thumbs/u/x.jpg" })
    expect(url).toContain("X-Amz-Signature")
  })
})
