import Link from "next/link"
import { prisma } from "@/lib/db"
import { presignGet } from "@/lib/r2"
import { LibraryView, type LibraryCard } from "@/components/library/LibraryView"

export const dynamic = "force-dynamic"

export default async function LibraryPage() {
  const albums = await prisma.album.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      coverPhoto: true,
      createdBy: { select: { name: true } },
      albumPhotos: {
        include: { photo: true },
        orderBy: { position: "asc" },
      },
    },
  })

  const cards: LibraryCard[] = await Promise.all(
    albums.map(async (a) => {
      const cover = a.coverPhoto ?? a.albumPhotos[0]?.photo ?? null
      const dates = a.albumPhotos
        .map((ap) => ap.photo.takenAt)
        .filter((d): d is Date => d !== null)
      return {
        id: a.id,
        title: a.title,
        author: a.createdBy?.name ?? null,
        photoCount: a.albumPhotos.length,
        coverUrl: cover
          ? await presignGet({ key: cover.thumbKey ?? cover.r2Key })
          : null,
        coverFullUrl: cover ? await presignGet({ key: cover.r2Key }) : null,
        coverW: cover?.width ?? null,
        coverH: cover?.height ?? null,
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

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <div className="mb-10 flex items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-xs uppercase tracking-[0.3em] text-terracotta">
            our collection
          </p>
          <h1 className="font-serif text-5xl font-light tracking-tight">
            The Library
          </h1>
        </div>
        <Link
          href="/albums/new"
          className="shrink-0 rounded-full border border-ink/15 px-5 py-2 text-sm text-ink/80 transition-colors duration-200 hover:border-terracotta hover:text-terracotta"
        >
          + New album
        </Link>
      </div>

      {cards.length === 0 ? (
        <div className="rounded-2xl border border-ink/10 px-6 py-24 text-center">
          <h2 className="font-serif text-3xl text-ink/80">No albums yet</h2>
          <p className="mx-auto mt-3 max-w-sm text-ink/50">
            An album is a story — a title, a cover, and photos in the order you
            choose. Start the first one.
          </p>
          <Link
            href="/albums/new"
            className="mt-8 inline-block rounded-full bg-terracotta px-6 py-2.5 font-medium text-paper transition-transform duration-200 ease-out active:scale-[0.97]"
          >
            Create an album
          </Link>
        </div>
      ) : (
        <LibraryView featured={cards[0]} rest={cards.slice(1)} />
      )}
    </main>
  )
}
