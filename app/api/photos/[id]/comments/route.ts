import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/db"
import { requireUser, UnauthorizedError } from "@/lib/session"

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Ctx) {
  try {
    await requireUser()
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    throw e
  }

  const { id } = await params
  const rows = await prisma.comment.findMany({
    where: { photoId: id },
    orderBy: { createdAt: "asc" },
    include: { author: true },
  })
  return NextResponse.json({
    comments: rows.map((c) => ({
      id: c.id,
      body: c.body,
      authorName: c.author.name,
      createdAt: c.createdAt.toISOString(),
    })),
  })
}

export async function POST(request: Request, { params }: Ctx) {
  let user
  try {
    user = await requireUser()
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    throw e
  }

  const { id } = await params

  let rawBody: unknown
  try {
    rawBody = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = z.object({ body: z.string().min(1).max(2000) }).safeParse(rawBody)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 })
  }

  const comment = await prisma.comment.create({
    data: { photoId: id, authorId: user.id, body: parsed.data.body },
  })
  return NextResponse.json({ id: comment.id }, { status: 201 })
}
