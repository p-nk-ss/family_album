import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { notFound } from "next/navigation"
import { prisma } from "@/lib/db"
import { presignGet } from "@/lib/r2"
import { ReorderGrid } from "@/components/album/ReorderGrid"
import { AlbumUploader } from "@/components/album/AlbumUploader"
import { DeleteAlbumButton } from "@/components/album/DeleteAlbumButton"

export const dynamic = "force-dynamic"

export default async function EditAlbumPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const album = await prisma.album.findUnique({
    where: { id },
    include: {
      albumPhotos: {
        include: { photo: true },
        orderBy: { position: "asc" },
      },
    },
  })
  if (!album) notFound()

  const initial = await Promise.all(
    album.albumPhotos.map(async (ap) => ({
      photoId: ap.photo.id,
      thumbUrl: await presignGet({ key: ap.photo.thumbKey ?? ap.photo.r2Key }),
      caption: ap.photo.caption,
    })),
  )

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <Link
        href={`/albums/${id}`}
        className="mb-8 inline-flex min-h-11 items-center gap-1.5 text-sm text-ink/60 transition-colors hover:text-terracotta"
      >
        <ArrowLeft size={16} aria-hidden /> Back to album
      </Link>

      <p className="eyebrow mb-3">editing album</p>
      <h1 className="font-serif text-4xl font-light tracking-tight">
        {album.title}
      </h1>
      <p className="mt-3 text-ink/60">
        Drag the handle to reorder. Set any photo as the cover, or remove it.
        Add a note to write on the back of a photo — readers flip it to read.
      </p>

      <div className="mt-8">
        {initial.length > 0 ? (
          <ReorderGrid
            key={initial.map((i) => i.photoId).join("-")}
            albumId={id}
            initial={initial}
            coverPhotoId={album.coverPhotoId}
          />
        ) : (
          <p className="text-sm text-ink/60">
            No photos in this album yet — add some below.
          </p>
        )}
      </div>

      <div className="mt-14 border-t border-ink/10 pt-10">
        <h2 className="font-serif text-2xl font-light">Add photos</h2>
        <p className="mb-5 mt-2 text-sm text-ink/60">
          Upload photos straight into this album. Each photo lives in one album.
        </p>
        <AlbumUploader albumId={id} />
      </div>

      <div className="mt-12 flex items-center justify-between border-t border-ink/10 pt-6">
        <Link
          href={`/albums/${id}`}
          className="rounded-full bg-terracotta px-7 py-3 font-medium text-paper shadow-[0_10px_40px_-12px_rgba(230,168,107,0.7)] transition-[transform,background-color] duration-200 ease-out hover:bg-[#f0b478] active:scale-[0.97]"
        >
          View story
        </Link>
        <DeleteAlbumButton albumId={id} />
      </div>
    </main>
  )
}
