import Link from "next/link"
import { prisma } from "@/lib/db"
import { presignGet } from "@/lib/r2"
import { AlbumCard } from "@/components/library/AlbumCard"

export const dynamic = "force-dynamic"

export default async function LibraryPage() {
  const albums = await prisma.album.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      coverPhoto: true,
      albumPhotos: {
        include: { photo: true },
        orderBy: { position: "asc" },
      },
    },
  })

  const cards = await Promise.all(
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
                from: new Date(
                  Math.min(...dates.map((d) => +d)),
                ).toISOString(),
                to: new Date(Math.max(...dates.map((d) => +d))).toISOString(),
              }
            : null,
      }
    }),
  )

  return (
    <main className="max-w-6xl mx-auto px-6 py-12">
      <div className="flex items-baseline justify-between mb-10">
        <h1 className="font-serif text-5xl">The Library</h1>
        <Link
          href="/albums/new"
          className="rounded-full bg-terracotta px-5 py-2 text-paper text-sm"
        >
          New album
        </Link>
      </div>
      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <AlbumCard key={c.id} {...c} />
        ))}
      </div>
    </main>
  )
}
