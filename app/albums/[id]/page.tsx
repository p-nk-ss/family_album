import Link from "next/link"
import { notFound } from "next/navigation"
import { prisma } from "@/lib/db"
import { presignGet } from "@/lib/r2"
import { Story, type StoryPhoto } from "@/components/album/Story"

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

  const photos: StoryPhoto[] = await Promise.all(
    album.albumPhotos.map(async (ap) => ({
      id: ap.photo.id,
      fullUrl: await presignGet({ key: ap.photo.r2Key }),
      thumbUrl: await presignGet({ key: ap.photo.thumbKey ?? ap.photo.r2Key }),
      blurhash: ap.photo.blurhash,
      width: ap.photo.width,
      height: ap.photo.height,
      caption: ap.photo.caption,
    })),
  )

  return (
    <main className="mx-auto max-w-3xl px-6 py-12 sm:py-16">
      <div className="mb-12 flex items-center justify-between text-sm">
        <Link
          href="/library"
          className="text-ink/55 transition-colors hover:text-terracotta"
        >
          ← All albums
        </Link>
        <Link
          href={`/albums/${id}/edit`}
          className="text-ink/55 transition-colors hover:text-terracotta"
        >
          Edit album
        </Link>
      </div>

      <header className="mb-16 text-center sm:mb-24">
        <h1 className="font-serif text-5xl font-light leading-[1.05] tracking-tight sm:text-7xl">
          {album.title}
        </h1>
        {album.description && (
          <p className="mx-auto mt-7 max-w-xl whitespace-pre-line text-lg leading-relaxed text-ink/65">
            {album.description}
          </p>
        )}
      </header>

      {photos.length > 0 ? (
        <Story photos={photos} />
      ) : (
        <p className="text-center text-ink/45">
          This album has no photos yet.{" "}
          <Link
            href={`/albums/${id}/edit`}
            className="text-terracotta hover:underline"
          >
            Add some
          </Link>
          .
        </p>
      )}
    </main>
  )
}
