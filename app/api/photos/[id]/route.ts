import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/db"
import { requireUser, UnauthorizedError } from "@/lib/session"
import { deleteObjects } from "@/lib/r2"

type Ctx = { params: Promise<{ id: string }> }

export async function DELETE(_req: Request, { params }: Ctx) {
  let user
  try {
    user = await requireUser()
  } catch (e) {
    if (e instanceof UnauthorizedError)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    throw e
  }

  const { id } = await params
  if (!z.string().uuid().safeParse(id).success)
    return NextResponse.json({ error: "Invalid id" }, { status: 400 })

  const photo = await prisma.photo.findUnique({
    where: { id },
    include: {
      albumPhotos: { include: { album: { select: { createdById: true } } } },
    },
  })
  if (!photo) return new NextResponse(null, { status: 404 })

  // The uploader or the creator of the album the photo lives in may delete it.
  const isUploader = photo.uploaderId === user.id
  const isAlbumCreator = photo.albumPhotos.some(
    (ap) => ap.album.createdById === user.id,
  )
  if (!isUploader && !isAlbumCreator)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  // No onDelete cascades: unset any album cover pointing here, then drop
  // comments + album links, then the photo row.
  await prisma.$transaction([
    prisma.album.updateMany({
      where: { coverPhotoId: id },
      data: { coverPhotoId: null },
    }),
    prisma.comment.deleteMany({ where: { photoId: id } }),
    prisma.albumPhoto.deleteMany({ where: { photoId: id } }),
    prisma.photo.delete({ where: { id } }),
  ])

  await deleteObjects([photo.r2Key, photo.thumbKey])

  return new NextResponse(null, { status: 204 })
}
