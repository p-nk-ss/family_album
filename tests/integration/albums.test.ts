import { describe, it, expect, beforeEach, vi } from "vitest"
import { resetDb, seedUser } from "../helpers/db"
import { stubSession } from "../helpers/session-stub"
import { prisma } from "@/lib/db"

let userId: string

beforeEach(async () => {
  vi.resetModules()
  await resetDb()
  const user = await seedUser()
  userId = user.id
  stubSession({ id: userId })
})

function jreq(url: string, method: string, body?: unknown) {
  return new Request(`http://localhost${url}`, {
    method,
    headers: { "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  })
}

describe("albums API", () => {
  it("creates an album and lists it", async () => {
    const { POST, GET } = await import("@/app/api/albums/route")
    const created = await POST(jreq("/api/albums", "POST", { title: "Summer 2024" }))
    expect(created.status).toBe(201)
    const { id } = await created.json()
    expect(id).toBeTruthy()

    const list = await GET()
    expect(list.status).toBe(200)
    const { albums } = await list.json()
    expect(albums.find((a: { id: string }) => a.id === id).title).toBe("Summer 2024")
  })

  it("returns 401 for POST without session", async () => {
    vi.resetModules()
    stubSession(null)
    const { POST } = await import("@/app/api/albums/route")
    const res = await POST(jreq("/api/albums", "POST", { title: "Fail" }))
    expect(res.status).toBe(401)
  })

  it("returns 400 for POST with invalid body", async () => {
    const { POST } = await import("@/app/api/albums/route")
    const res = await POST(jreq("/api/albums", "POST", { title: "" }))
    expect(res.status).toBe(400)
  })

  it("forbids deleting an album you did not create", async () => {
    const { POST } = await import("@/app/api/albums/route")
    const created = await POST(jreq("/api/albums", "POST", { title: "Mine" }))
    expect(created.status).toBe(201)
    const { id } = await created.json()

    // Switch to a different user
    vi.resetModules()
    stubSession({ id: "00000000-0000-0000-0000-000000000099" })
    const { DELETE } = await import("@/app/api/albums/[id]/route")
    const res = await DELETE(
      jreq(`/api/albums/${id}`, "DELETE"),
      { params: Promise.resolve({ id }) },
    )
    expect(res.status).toBe(403)
  })

  it("returns 404 when deleting a non-existent album", async () => {
    const { DELETE } = await import("@/app/api/albums/[id]/route")
    const fakeId = "00000000-0000-0000-0000-000000000000"
    const res = await DELETE(
      jreq(`/api/albums/${fakeId}`, "DELETE"),
      { params: Promise.resolve({ id: fakeId }) },
    )
    expect(res.status).toBe(404)
  })

  it("creator can delete their own album", async () => {
    const { POST } = await import("@/app/api/albums/route")
    const created = await POST(jreq("/api/albums", "POST", { title: "Delete Me" }))
    const { id } = await created.json()

    const { DELETE } = await import("@/app/api/albums/[id]/route")
    const res = await DELETE(
      jreq(`/api/albums/${id}`, "DELETE"),
      { params: Promise.resolve({ id }) },
    )
    expect(res.status).toBe(204)
  })

  it("deletes an album that contains photos (cascade-safe transaction)", async () => {
    const { POST } = await import("@/app/api/albums/route")
    const created = await POST(jreq("/api/albums", "POST", { title: "Has Photos" }))
    const { id } = await created.json()

    // Seed a photo and link it into the album so deleteMany has work to do.
    const photo = await prisma.photo.create({
      data: {
        r2Key: "photos/u/del.jpg",
        contentType: "image/jpeg",
        uploaderId: userId,
      },
    })
    await prisma.albumPhoto.create({
      data: { albumId: id, photoId: photo.id, position: 0 },
    })

    const { DELETE } = await import("@/app/api/albums/[id]/route")
    const res = await DELETE(
      jreq(`/api/albums/${id}`, "DELETE"),
      { params: Promise.resolve({ id }) },
    )
    expect(res.status).toBe(204)

    // Album and its albumPhoto rows are gone; the photo itself survives.
    expect(await prisma.album.findUnique({ where: { id } })).toBeNull()
    expect(await prisma.albumPhoto.findMany({ where: { albumId: id } })).toHaveLength(0)
    expect(await prisma.photo.findUnique({ where: { id: photo.id } })).not.toBeNull()
  })

  it("GET /api/albums/[id] returns album by id", async () => {
    const { POST } = await import("@/app/api/albums/route")
    const created = await POST(jreq("/api/albums", "POST", { title: "Detail Test" }))
    const { id } = await created.json()

    const { GET } = await import("@/app/api/albums/[id]/route")
    const res = await GET(
      jreq(`/api/albums/${id}`, "GET"),
      { params: Promise.resolve({ id }) },
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.album.title).toBe("Detail Test")
  })

  it("GET /api/albums/[id] returns 404 for missing album", async () => {
    const { GET } = await import("@/app/api/albums/[id]/route")
    const fakeId = "00000000-0000-0000-0000-000000000001"
    const res = await GET(
      jreq(`/api/albums/${fakeId}`, "GET"),
      { params: Promise.resolve({ id: fakeId }) },
    )
    expect(res.status).toBe(404)
  })

  it("PATCH /api/albums/[id] updates album title", async () => {
    const { POST } = await import("@/app/api/albums/route")
    const created = await POST(jreq("/api/albums", "POST", { title: "Old Title" }))
    const { id } = await created.json()

    const { PATCH } = await import("@/app/api/albums/[id]/route")
    const res = await PATCH(
      jreq(`/api/albums/${id}`, "PATCH", { title: "New Title" }),
      { params: Promise.resolve({ id }) },
    )
    expect(res.status).toBe(200)
  })
})
