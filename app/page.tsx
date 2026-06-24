import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { presignGet } from "@/lib/r2"
import { LandingHero } from "@/components/landing/LandingHero"
import {
  LandingShowcase,
  type ShowcaseStats,
  type ShowcaseTeaser,
} from "@/components/landing/LandingShowcase"

export const dynamic = "force-dynamic"

export default async function Home() {
  const session = await auth()
  const signedIn = Boolean(session?.user)

  // The public front door must never leak private imagery: only signed-in
  // visitors get the photo montage, the stats, and the latest-album teaser.
  let covers: string[] = []
  let stats: ShowcaseStats | null = null
  let teaser: ShowcaseTeaser | null = null

  if (signedIn) {
    const albums = await prisma.album.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        coverPhoto: true,
        createdBy: { select: { name: true } },
        albumPhotos: { include: { photo: true }, orderBy: { position: "asc" } },
      },
    })

    // recent covers for the slow cross-fading montage (full-res, capped)
    const coverPhotos = albums
      .map((a) => a.coverPhoto ?? a.albumPhotos[0]?.photo ?? null)
      .filter((p): p is NonNullable<typeof p> => p !== null)
    covers = await Promise.all(
      coverPhotos.slice(0, 6).map((p) => presignGet({ key: p.r2Key })),
    )

    const totalPhotos = albums.reduce((n, a) => n + a.albumPhotos.length, 0)
    const allDates = albums.flatMap((a) =>
      a.albumPhotos
        .map((ap) => ap.photo.takenAt)
        .filter((d): d is Date => d !== null),
    )
    const sinceYear =
      allDates.length > 0
        ? new Date(Math.min(...allDates.map((d) => +d))).getFullYear()
        : albums.length > 0
          ? albums[albums.length - 1].createdAt.getFullYear()
          : new Date().getFullYear()
    stats = { albums: albums.length, photos: totalPhotos, sinceYear }

    const latest = albums[0]
    if (latest) {
      const cover = latest.coverPhoto ?? latest.albumPhotos[0]?.photo ?? null
      const dates = latest.albumPhotos
        .map((ap) => ap.photo.takenAt)
        .filter((d): d is Date => d !== null)
      teaser = {
        id: latest.id,
        title: latest.title,
        author: latest.createdBy?.name ?? null,
        photoCount: latest.albumPhotos.length,
        coverFullUrl: cover ? await presignGet({ key: cover.r2Key }) : null,
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
    }
  }

  return (
    <main>
      <LandingHero covers={covers} signedIn={signedIn} />
      {signedIn && stats && <LandingShowcase stats={stats} teaser={teaser} />}
    </main>
  )
}
