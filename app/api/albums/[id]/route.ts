import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/db"
import { requireUser, UnauthorizedError } from "@/lib/session"
import { deleteObjects } from "@/lib/r2"

type Ctx = { params: Promise<{ id: string }> }

const patchSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).nullable().optional(),
  coverPhotoId: z.string().uuid().nullable().optional(),
})

export async function GET(_req: Request, { params }: Ctx) {
  try {
    await requireUser()
  } catch (e) {
    if (e instanceof UnauthorizedError)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    throw e
  }

  const { id } = await params
  const album = await prisma.album.findUnique({
    where: { id },
    include: {
      albumPhotos: { include: { photo: true }, orderBy: { position: "asc" } },
    },
  })
  if (!album) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json({ album })
}

export async function PATCH(request: Request, { params }: Ctx) {
  const { id } = await params

  try {
    await requireUser()
  } catch (e) {
    if (e instanceof UnauthorizedError)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    throw e
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = patchSchema.safeParse(body)
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.message }, { status: 400 })

  await prisma.album.update({ where: { id }, data: parsed.data })
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params

  let user
  try {
    user = await requireUser()
  } catch (e) {
    if (e instanceof UnauthorizedError)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    throw e
  }

  const album = await prisma.album.findUnique({
    where: { id },
    include: { albumPhotos: { include: { photo: true } } },
  })
  if (!album) return new NextResponse(null, { status: 404 })

  if (album.createdById !== user.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  // Photos belong to this album, so deleting it deletes its photos too.
  // No onDelete cascades: unset the cover, then drop comments → album links →
  // photos → album, in FK-safe order.
  const photos = album.albumPhotos.map((ap) => ap.photo)
  const photoIds = photos.map((p) => p.id)

  await prisma.$transaction([
    prisma.album.update({ where: { id }, data: { coverPhotoId: null } }),
    prisma.comment.deleteMany({ where: { photoId: { in: photoIds } } }),
    prisma.albumPhoto.deleteMany({ where: { albumId: id } }),
    prisma.photo.deleteMany({ where: { id: { in: photoIds } } }),
    prisma.album.delete({ where: { id } }),
  ])

  await deleteObjects(photos.flatMap((p) => [p.r2Key, p.thumbKey]))

  return new NextResponse(null, { status: 204 })
}
