import { describe, it, expect, beforeEach, vi } from "vitest"
import { resetDb, seedUser } from "../helpers/db"
import { stubSession } from "../helpers/session-stub"

let userId: string

beforeEach(async () => {
  vi.resetModules()
  await resetDb()
  const user = await seedUser()
  userId = user.id
  stubSession({ id: userId })
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
    const { POST, GET } = await import("@/app/api/photos/route")

    const created = await POST(postReq(validBody))
    expect(created.status).toBe(201)
    const { id } = await created.json()
    expect(id).toBeTruthy()

    const list = await GET(new Request("http://localhost/api/photos"))
    expect(list.status).toBe(200)
    const { photos } = await list.json()
    expect(photos).toHaveLength(1)
    expect(photos[0].id).toBe(id)
    expect(photos[0].thumbUrl).toContain("X-Amz-Signature")
    expect(photos[0].blurhash).toBe(validBody.blurhash)
    // takenAt ISO round-trip (ISO in → Date stored → ISO out) and dimensions
    expect(photos[0].takenAt).toBe(validBody.takenAt)
    expect(photos[0].width).toBe(validBody.width)
    expect(photos[0].height).toBe(validBody.height)
  })

  it("rejects an invalid body", async () => {
    const { POST } = await import("@/app/api/photos/route")
    const res = await POST(postReq({ r2Key: "x" }))
    expect(res.status).toBe(400)
  })

  it("returns 401 without a session (POST)", async () => {
    vi.resetModules()
    stubSession(null)
    const { POST } = await import("@/app/api/photos/route")
    const res = await POST(postReq(validBody))
    expect(res.status).toBe(401)
  })

  it("returns 401 without a session (GET)", async () => {
    vi.resetModules()
    stubSession(null)
    const { GET } = await import("@/app/api/photos/route")
    const res = await GET(new Request("http://localhost/api/photos"))
    expect(res.status).toBe(401)
  })
})
