import { describe, it, expect, beforeEach, vi } from "vitest"
import { resetDb, seedUser } from "../helpers/db"
import { stubSession } from "../helpers/session-stub"
import { prisma } from "@/lib/db"

let userId: string
let albumId: string
let p1: string
let p2: string

beforeEach(async () => {
  vi.resetModules()
  await resetDb()
  const user = await seedUser()
  userId = user.id
  stubSession({ id: userId })

  albumId = (
    await prisma.album.create({ data: { title: "A", createdById: userId } })
  ).id

  p1 = (
    await prisma.photo.create({
      data: {
        r2Key: "photos/u/1.jpg",
        contentType: "image/jpeg",
        uploaderId: userId,
      },
    })
  ).id

  p2 = (
    await prisma.photo.create({
      data: {
        r2Key: "photos/u/2.jpg",
        contentType: "image/jpeg",
        uploaderId: userId,
      },
    })
  ).id
})

function jreq(method: string, body: unknown) {
  return new Request(`http://localhost/api/albums/${albumId}/photos`, {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  })
}

const ctx = () => ({ params: Promise.resolve({ id: albumId }) })

describe("album photos", () => {
  it("adds photos then reorders them", async () => {
    const { POST, PATCH } = await import("@/app/api/albums/[id]/photos/route")

    const r1 = await POST(jreq("POST", { photoId: p1 }), ctx())
    expect(r1.status).toBe(201)

    const r2 = await POST(jreq("POST", { photoId: p2 }), ctx())
    expect(r2.status).toBe(201)

    // Verify initial order: p1=0, p2=1
    const before = await prisma.albumPhoto.findMany({
      where: { albumId },
      orderBy: { position: "asc" },
    })
    expect(before.map((r) => r.photoId)).toEqual([p1, p2])

    // Reorder to [p2, p1]
    const res = await PATCH(jreq("PATCH", { orderedPhotoIds: [p2, p1] }), ctx())
    expect(res.status).toBe(200)

    const rows = await prisma.albumPhoto.findMany({
      where: { albumId },
      orderBy: { position: "asc" },
    })
    expect(rows.map((r) => r.photoId)).toEqual([p2, p1])
  })

  it("removes a photo from the album", async () => {
    const { POST, DELETE } = await import("@/app/api/albums/[id]/photos/route")

    await POST(jreq("POST", { photoId: p1 }), ctx())
    await POST(jreq("POST", { photoId: p2 }), ctx())

    const res = await DELETE(jreq("DELETE", { photoId: p1 }), ctx())
    expect(res.status).toBe(200)

    const rows = await prisma.albumPhoto.findMany({ where: { albumId } })
    expect(rows).toHaveLength(1)
    expect(rows[0].photoId).toBe(p2)
  })

  it("rejects adding a photo that already belongs to another album (409)", async () => {
    const { POST } = await import("@/app/api/albums/[id]/photos/route")

    // p1 goes into the first album.
    const first = await POST(jreq("POST", { photoId: p1 }), ctx())
    expect(first.status).toBe(201)

    // A second album cannot claim the same photo.
    const album2 = await prisma.album.create({
      data: { title: "B", createdById: userId },
    })
    const req = new Request(
      `http://localhost/api/albums/${album2.id}/photos`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ photoId: p1 }),
      },
    )
    const res = await POST(req, { params: Promise.resolve({ id: album2.id }) })
    expect(res.status).toBe(409)

    // Re-adding to the SAME album is a no-op (200), not a duplicate.
    const again = await POST(jreq("POST", { photoId: p1 }), ctx())
    expect(again.status).toBe(200)
    expect(
      await prisma.albumPhoto.count({ where: { albumId, photoId: p1 } }),
    ).toBe(1)
  })

  it("returns 401 without session", async () => {
    vi.resetModules()
    stubSession(null)
    const { POST } = await import("@/app/api/albums/[id]/photos/route")
    const res = await POST(jreq("POST", { photoId: p1 }), ctx())
    expect(res.status).toBe(401)
  })

  it("returns 400 when reordering with invalid permutation", async () => {
    const { POST, PATCH } = await import("@/app/api/albums/[id]/photos/route")
    await POST(jreq("POST", { photoId: p1 }), ctx())

    // Attempt to reorder with a different photoId than what's in the album
    const res = await PATCH(jreq("PATCH", { orderedPhotoIds: [p2] }), ctx())
    expect(res.status).toBe(400)
  })
})
