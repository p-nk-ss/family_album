import Link from "next/link"
import { ArrowLeft, Pencil } from "lucide-react"
import { notFound } from "next/navigation"
import { prisma } from "@/lib/db"
import { presignGet } from "@/lib/r2"
import { Story, type StoryPhoto } from "@/components/album/Story"
import { ChapterCover } from "@/components/album/ChapterCover"

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
      coverPhoto: true,
      createdBy: { select: { name: true } },
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

  const cover = album.coverPhoto ?? album.albumPhotos[0]?.photo ?? null
  const coverUrl = cover ? await presignGet({ key: cover.r2Key }) : null

  const dates = album.albumPhotos
    .map((ap) => ap.photo.takenAt)
    .filter((d): d is Date => d !== null)
  const range =
    dates.length > 0
      ? formatRange(
          new Date(Math.min(...dates.map((d) => +d))).getFullYear(),
          new Date(Math.max(...dates.map((d) => +d))).getFullYear(),
        )
      : null
  const meta = [
    `${album.albumPhotos.length} ${album.albumPhotos.length === 1 ? "photo" : "photos"}`,
    range,
    album.createdBy?.name ? `by ${album.createdBy.name}` : null,
  ]
    .filter(Boolean)
    .join("  ·  ")

  return (
    <main className="pb-24">
      {/* the chapter cover is full-bleed; nav floats over it as quiet glass
          pills so it reads on the photo without breaking the cinematic entrance */}
      <div className="relative">
        <ChapterCover
          title={album.title}
          description={album.description}
          meta={meta}
          coverUrl={coverUrl}
        />
        {/* dark band so the nav always has a backing, even over a bright photo */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 z-[5] h-28 bg-gradient-to-b from-black/60 to-transparent"
        />
        <div className="absolute inset-x-0 top-0 z-10 mx-auto flex max-w-5xl items-center justify-between px-5 py-4 sm:px-6">
          <Link
            href="/library"
            className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-white/30 bg-black/45 px-4 text-sm font-medium text-white shadow-sm backdrop-blur-md transition-colors duration-200 hover:border-terracotta hover:text-terracotta"
          >
            <ArrowLeft size={16} aria-hidden /> All albums
          </Link>
          <Link
            href={`/albums/${id}/edit`}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-white/30 bg-black/45 px-4 text-sm font-medium text-white shadow-sm backdrop-blur-md transition-colors duration-200 hover:border-terracotta hover:text-terracotta"
          >
            <Pencil size={14} aria-hidden /> Edit album
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-6 pt-14 sm:pt-20">
        {photos.length > 0 ? (
          <Story photos={photos} />
        ) : (
          <p className="text-center text-ink/60">
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
      </div>
    </main>
  )
}

function formatRange(from: number, to: number): string {
  return from === to ? String(from) : `${from}–${to}`
}
