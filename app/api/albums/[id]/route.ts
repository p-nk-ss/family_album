import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/db"
import { requireUser, UnauthorizedError } from "@/lib/session"

type Ctx = { params: Promise<{ id: string }> }

const patchSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).nullable().optional(),
  coverPhotoId: z.string().uuid().nullable().optional(),
})

export async function GET(_req: Request, { params }: Ctx) {
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

  const album = await prisma.album.findUnique({ where: { id } })
  if (!album) return new NextResponse(null, { status: 404 })

  if (album.createdById !== user.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  // No onDelete cascades — delete albumPhoto rows first, then the album
  await prisma.$transaction([
    prisma.albumPhoto.deleteMany({ where: { albumId: id } }),
    prisma.album.delete({ where: { id } }),
  ])

  return new NextResponse(null, { status: 204 })
}
