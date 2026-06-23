import { describe, it, expect, beforeEach, vi } from "vitest"
import { resetDb, seedUser } from "../helpers/db"
import { stubSession } from "../helpers/session-stub"
import { prisma } from "@/lib/db"

// R2 deletion is a best-effort side effect; stub it so the test stays pure DB.
vi.mock("@/lib/r2", () => ({ deleteObjects: vi.fn(async () => undefined) }))

let userId: string
let albumId: string
let photoId: string

beforeEach(async () => {
  vi.resetModules()
  await resetDb()
  const user = await seedUser()
  userId = user.id
  stubSession({ id: userId })

  albumId = (
    await prisma.album.create({ data: { title: "A", createdById: userId } })
  ).id
  photoId = (
    await prisma.photo.create({
      data: {
        r2Key: "photos/u/x.jpg",
        thumbKey: "thumbs/u/x.jpg",
        contentType: "image/jpeg",
        uploaderId: userId,
      },
    })
  ).id
  await prisma.albumPhoto.create({ data: { albumId, photoId, position: 0 } })
  await prisma.album.update({
    where: { id: albumId },
    data: { coverPhotoId: photoId },
  })
})

const ctx = (id: string) => ({ params: Promise.resolve({ id }) })
const dreq = (id: string) =>
  new Request(`http://localhost/api/photos/${id}`, { method: "DELETE" })

describe("DELETE /api/photos/[id]", () => {
  it("deletes the photo, its album link, and unsets the cover", async () => {
    const { DELETE } = await import("@/app/api/photos/[id]/route")
    const res = await DELETE(dreq(photoId), ctx(photoId))
    expect(res.status).toBe(204)

    expect(await prisma.photo.findUnique({ where: { id: photoId } })).toBeNull()
    expect(
      await prisma.albumPhoto.findMany({ where: { photoId } }),
    ).toHaveLength(0)
    expect(
      (await prisma.album.findUnique({ where: { id: albumId } }))?.coverPhotoId,
    ).toBeNull()
  })

  it("returns 401 without a session", async () => {
    vi.resetModules()
    stubSession(null)
    const { DELETE } = await import("@/app/api/photos/[id]/route")
    const res = await DELETE(dreq(photoId), ctx(photoId))
    expect(res.status).toBe(401)
  })

  it("returns 403 for a user who is neither uploader nor album creator", async () => {
    vi.resetModules()
    const other = await seedUser("other@example.com")
    stubSession({ id: other.id })
    const { DELETE } = await import("@/app/api/photos/[id]/route")
    const res = await DELETE(dreq(photoId), ctx(photoId))
    expect(res.status).toBe(403)
    expect(await prisma.photo.findUnique({ where: { id: photoId } })).not.toBeNull()
  })
})
