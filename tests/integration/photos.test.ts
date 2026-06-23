import { describe, it, expect, beforeEach } from "vitest"
import { POST, GET } from "@/app/api/photos/route"
import { resetDb } from "../helpers/db"

beforeEach(async () => {
  await resetDb()
})

function postReq(body: unknown) {
  return new Request("http://localhost/api/photos", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  })
}

const validBody = {
  r2Key: "photos/anon/abc.jpg",
  thumbKey: "thumbs/anon/abc.jpg",
  contentType: "image/jpeg",
  sizeBytes: 1234,
  width: 800,
  height: 600,
  takenAt: "2024-01-01T00:00:00.000Z",
  blurhash: "LEHV6nWB2yk8pyo0adR*.7kCMdnj",
}

describe("photos API", () => {
  it("creates a photo row and lists it with a signed thumb url", async () => {
    const created = await POST(postReq(validBody))
    expect(created.status).toBe(201)
    const { id } = await created.json()
    expect(id).toBeTruthy()

    const list = await GET()
    expect(list.status).toBe(200)
    const { photos } = await list.json()
    expect(photos).toHaveLength(1)
    expect(photos[0].id).toBe(id)
    expect(photos[0].thumbUrl).toContain("X-Amz-Signature")
    expect(photos[0].blurhash).toBe(validBody.blurhash)
  })

  it("rejects an invalid body", async () => {
    const res = await POST(postReq({ r2Key: "x" }))
    expect(res.status).toBe(400)
  })
})
