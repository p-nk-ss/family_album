import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/db"
import { requireUser, UnauthorizedError } from "@/lib/session"
import { applyReorder } from "@/lib/reorder"

type Ctx = { params: Promise<{ id: string }> }

async function guard() {
  try {
    await requireUser()
    return null
  } catch (e) {
    if (e instanceof UnauthorizedError)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    throw e
  }
}

export async function POST(request: Request, { params }: Ctx) {
  const denied = await guard()
  if (denied) return denied

  const { id: albumId } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = z.object({ photoId: z.string().uuid() }).safeParse(body)
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.message }, { status: 400 })

  const count = await prisma.albumPhoto.count({ where: { albumId } })
  await prisma.albumPhoto.create({
    data: { albumId, photoId: parsed.data.photoId, position: count },
  })

  return NextResponse.json({ ok: true }, { status: 201 })
}

export async function DELETE(request: Request, { params }: Ctx) {
  const denied = await guard()
  if (denied) return denied

  const { id: albumId } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = z.object({ photoId: z.string().uuid() }).safeParse(body)
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.message }, { status: 400 })

  await prisma.albumPhoto.delete({
    where: {
      albumId_photoId: { albumId, photoId: parsed.data.photoId },
    },
  })

  return NextResponse.json({ ok: true })
}

export async function PATCH(request: Request, { params }: Ctx) {
  const denied = await guard()
  if (denied) return denied

  const { id: albumId } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = z
    .object({ orderedPhotoIds: z.array(z.string().uuid()) })
    .safeParse(body)
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.message }, { status: 400 })

  const current = await prisma.albumPhoto.findMany({ where: { albumId } })

  // applyReorder validates the permutation and throws if invalid
  const next = applyReorder(
    current.map((c) => ({ photoId: c.photoId, position: c.position })),
    parsed.data.orderedPhotoIds,
  )

  await prisma.$transaction(
    next.map((n) =>
      prisma.albumPhoto.update({
        where: { albumId_photoId: { albumId, photoId: n.photoId } },
        data: { position: n.position },
      }),
    ),
  )

  return NextResponse.json({ ok: true })
}
