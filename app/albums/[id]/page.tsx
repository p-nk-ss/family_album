import Link from "next/link"
import { notFound } from "next/navigation"
import { prisma } from "@/lib/db"
import { presignGet } from "@/lib/r2"
import { StoryPhoto } from "@/components/album/StoryPhoto"

export const dynamic = "force-dynamic"

export default async function AlbumPage({
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

  const photos = await Promise.all(
    album.albumPhotos.map(async (ap) => ({
      id: ap.photo.id,
      src: await presignGet({ key: ap.photo.r2Key }),
      blurhash: ap.photo.blurhash,
      width: ap.photo.width,
      height: ap.photo.height,
      caption: ap.photo.caption,
    })),
  )

  return (
    <main className="max-w-3xl mx-auto px-6 py-16">
      <div className="mb-10 flex items-center justify-between text-sm">
        <Link
          href="/library"
          className="text-ink/60 hover:text-terracotta transition-colors"
        >
          ← All albums
        </Link>
        <Link
          href={`/albums/${id}/edit`}
          className="text-ink/60 hover:text-terracotta transition-colors"
        >
          Edit album
        </Link>
      </div>
      <header className="mb-16 text-center">
        <h1 className="font-serif text-6xl">{album.title}</h1>
        {album.description && (
          <p className="mt-6 text-lg text-ink/70 whitespace-pre-line">
            {album.description}
          </p>
        )}
      </header>
      {photos.map((p) => (
        <StoryPhoto key={p.id} {...p} />
      ))}
    </main>
  )
}
