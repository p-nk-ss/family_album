"use client"

import { Reveal } from "@/components/motion/Reveal"
import { FeaturedAlbum } from "./FeaturedAlbum"
import { AlbumCard } from "./AlbumCard"

export type LibraryCard = {
  id: string
  title: string
  author?: string | null
  photoCount: number
  coverUrl: string | null
  coverFullUrl: string | null
  coverW?: number | null
  coverH?: number | null
  dateRange: { from: string; to: string } | null
}

export function LibraryView({
  featured,
  rest,
}: {
  featured: LibraryCard | null
  rest: LibraryCard[]
}) {
  return (
    <>
      {featured && (
        <Reveal>
          <FeaturedAlbum {...featured} />
        </Reveal>
      )}

      {rest.length > 0 && (
        // editorial masonry: respects each cover's aspect ratio instead of
        // cropping everything to a uniform tile
        <div className="mt-8 gap-6 sm:columns-2 lg:columns-3">
          {rest.map((c, i) => (
            <Reveal
              key={c.id}
              delay={Math.min(i, 6) * 0.05}
              y={18}
              className="mb-6 break-inside-avoid"
            >
              <AlbumCard {...c} />
            </Reveal>
          ))}
        </div>
      )}
    </>
  )
}
