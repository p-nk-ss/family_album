import { describe, it, expect, beforeEach, vi } from "vitest"
import { stubSession } from "../helpers/session-stub"

beforeEach(() => {
  vi.resetModules()
  stubSession({ id: "u1" })
})

function req(body: unknown) {
  return new Request("http://localhost/api/upload-url", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  })
}

describe("POST /api/upload-url", () => {
  it("returns presigned URLs and keys for a valid request", async () => {
    const { POST } = await import("@/app/api/upload-url/route")
    const res = await POST(req({ filename: "a.jpg", contentType: "image/jpeg", sizeBytes: 1000 }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.originalKey).toMatch(/^photos\/u1\/.+\.jpg$/)
    expect(json.thumbKey).toMatch(/^thumbs\/u1\/.+\.jpg$/)
    expect(json.originalUrl).toContain("X-Amz-Signature")
    expect(json.thumbUrl).toContain("X-Amz-Signature")
  })

  it("returns 400 for an unsupported type", async () => {
    const { POST } = await import("@/app/api/upload-url/route")
    const res = await POST(req({ filename: "a.pdf", contentType: "application/pdf", sizeBytes: 10 }))
    expect(res.status).toBe(400)
  })

  it("returns 401 without a session", async () => {
    vi.resetModules()
    stubSession(null)
    const { POST } = await import("@/app/api/upload-url/route")
    const res = await POST(req({ filename: "a.jpg", contentType: "image/jpeg", sizeBytes: 1000 }))
    expect(res.status).toBe(401)
  })
})
