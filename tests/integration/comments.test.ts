import { describe, it, expect, beforeEach, vi } from "vitest"
import { resetDb, seedUser } from "../helpers/db"
import { stubSession } from "../helpers/session-stub"
import { prisma } from "@/lib/db"

let userId: string
let photoId: string

beforeEach(async () => {
  vi.resetModules()
  await resetDb()
  const user = await seedUser()
  userId = user.id
  stubSession({ id: userId })
  const photo = await prisma.photo.create({
    data: {
      r2Key: "photos/u/x.jpg",
      contentType: "image/jpeg",
      uploaderId: userId,
    },
  })
  photoId = photo.id
})

const ctx = () => ({ params: Promise.resolve({ id: photoId }) })

describe("comments API", () => {
  it("adds a comment (POST 201) and lists it (GET)", async () => {
    const { POST, GET } = await import("@/app/api/photos/[id]/comments/route")

    const created = await POST(
      new Request("http://localhost", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body: "Lovely!" }),
      }),
      ctx()
    )
    expect(created.status).toBe(201)
    const { id: commentId } = await created.json()
    expect(commentId).toBeTruthy()

    const list = await GET(new Request("http://localhost"), ctx())
    expect(list.status).toBe(200)
    const { comments } = await list.json()
    expect(comments).toHaveLength(1)
    expect(comments[0].body).toBe("Lovely!")
    expect(comments[0].authorName).toBe("Test")
    expect(comments[0].id).toBe(commentId)
    expect(typeof comments[0].createdAt).toBe("string")
  })

  it("returns 401 on POST without session", async () => {
    vi.resetModules()
    stubSession(null)
    const { POST } = await import("@/app/api/photos/[id]/comments/route")
    const res = await POST(
      new Request("http://localhost", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body: "Nope" }),
      }),
      ctx()
    )
    expect(res.status).toBe(401)
  })

  it("returns 400 for an empty body string", async () => {
    const { POST } = await import("@/app/api/photos/[id]/comments/route")
    const res = await POST(
      new Request("http://localhost", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body: "" }),
      }),
      ctx()
    )
    expect(res.status).toBe(400)
  })

  it("returns 401 on GET without session", async () => {
    vi.resetModules()
    stubSession(null)
    const { GET } = await import("@/app/api/photos/[id]/comments/route")
    const res = await GET(new Request("http://localhost"), ctx())
    expect(res.status).toBe(401)
  })
})
