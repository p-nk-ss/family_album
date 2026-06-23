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
    })),
  )

  return (
    <main className="max-w-2xl mx-auto px-6 py-12">
      <h1 className="font-serif text-4xl mb-2">{album.title}</h1>
      <p className="text-ink/60 mb-8">
        Drag to reorder. Click a photo to make it the cover.
      </p>
      {initial.length > 0 ? (
        <ReorderGrid
          key={initial.map((i) => i.photoId).join("-")}
          albumId={id}
          initial={initial}
          coverPhotoId={album.coverPhotoId}
        />
      ) : (
        <p className="text-ink/50 text-sm">
          No photos in this album yet — add some below.
        </p>
      )}

      <h2 className="font-serif text-2xl mt-10 mb-4">Add photos</h2>
      <p className="text-ink/60 text-sm mb-4">
        Upload photos straight into this album. Each photo lives in one album.
      </p>
      <AlbumUploader albumId={id} />

      <div className="mt-12 flex items-center justify-between border-t border-ink/10 pt-6">
        <a
          href={`/albums/${id}`}
          className="inline-block rounded-full bg-terracotta px-6 py-2 text-paper"
        >
          View story
        </a>
        <DeleteAlbumButton albumId={id} />
      </div>
    </main>
  )
}
