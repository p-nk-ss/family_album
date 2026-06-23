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

  // A photo belongs to exactly one album. If it is already attached somewhere,
  // reject (409) unless it's already in THIS album (then it's a no-op).
  const existing = await prisma.albumPhoto.findFirst({
    where: { photoId: parsed.data.photoId },
  })
  if (existing) {
    if (existing.albumId === albumId)
      return NextResponse.json({ ok: true }, { status: 200 })
    return NextResponse.json(
      { error: "Photo already belongs to another album" },
      { status: 409 },
    )
  }

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

  // applyReorder validates the permutation and throws if invalid — bad client
  // input (wrong ids, duplicates, wrong length) is a 400, not a 500.
  let next
  try {
    next = applyReorder(
      current.map((c) => ({ photoId: c.photoId, position: c.position })),
      parsed.data.orderedPhotoIds,
    )
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Invalid reorder" },
      { status: 400 },
    )
  }

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
