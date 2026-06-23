import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { photoMetadataSchema } from "@/lib/validation"
import { signPhotoList } from "@/lib/dto"
import { requireUser, UnauthorizedError } from "@/lib/session"

export async function POST(request: Request) {
  let uploaderId: string
  try {
    uploaderId = (await requireUser()).id
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    throw e
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = photoMetadataSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 })
  }

  const d = parsed.data

  const photo = await prisma.photo.create({
    data: {
      r2Key: d.r2Key,
      thumbKey: d.thumbKey,
      contentType: d.contentType,
      sizeBytes: d.sizeBytes,
      width: d.width,
      height: d.height,
      takenAt: d.takenAt ? new Date(d.takenAt) : null,
      blurhash: d.blurhash,
      caption: d.caption ?? null,
      uploaderId,
    },
  })

  return NextResponse.json({ id: photo.id }, { status: 201 })
}

export async function GET() {
  try {
    await requireUser()
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    throw e
  }

  const rows = await prisma.photo.findMany({
    orderBy: [{ takenAt: "desc" }, { uploadedAt: "desc" }],
    take: 200,
  })
  const photos = await signPhotoList(rows)
  return NextResponse.json({ photos })
}
