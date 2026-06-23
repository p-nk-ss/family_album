import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/db"
import { requireUser, UnauthorizedError } from "@/lib/session"
import { presignGet } from "@/lib/r2"

const createSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
})

export async function POST(request: Request) {
  let user
  try {
    user = await requireUser()
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

  const parsed = createSchema.safeParse(body)
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.message }, { status: 400 })

  const album = await prisma.album.create({
    data: {
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      createdById: user.id,
    },
  })

  return NextResponse.json({ id: album.id }, { status: 201 })
}

export async function GET() {
  const albums = await prisma.album.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      coverPhoto: true,
      albumPhotos: { include: { photo: true }, orderBy: { position: "asc" } },
    },
  })

  const result = await Promise.all(
    albums.map(async (a) => {
      const cover = a.coverPhoto ?? a.albumPhotos[0]?.photo ?? null
      const dates = a.albumPhotos
        .map((ap) => ap.photo.takenAt)
        .filter((d): d is Date => d !== null)

      return {
        id: a.id,
        title: a.title,
        photoCount: a.albumPhotos.length,
        coverThumbUrl: cover
          ? await presignGet({ key: cover.thumbKey ?? cover.r2Key })
          : null,
        dateRange:
          dates.length > 0
            ? {
                from: new Date(Math.min(...dates.map((d) => +d))).toISOString(),
                to: new Date(Math.max(...dates.map((d) => +d))).toISOString(),
              }
            : null,
      }
    }),
  )

  return NextResponse.json({ albums: result })
}
