"use client"

import { motion, useReducedMotion } from "framer-motion"
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
  const reduce = useReducedMotion()

  return (
    <>
      {featured && (
        <motion.div
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 120, damping: 22 }}
        >
          <FeaturedAlbum {...featured} />
        </motion.div>
      )}

      {rest.length > 0 && (
        // editorial masonry: respects each cover's aspect ratio instead of
        // cropping everything to a uniform tile
        <div className="mt-8 gap-6 sm:columns-2 lg:columns-3">
          {rest.map((c, i) => (
            <motion.div
              key={c.id}
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{
                type: "spring",
                stiffness: 200,
                damping: 26,
                delay: Math.min(i, 6) * 0.05,
              }}
              className="mb-6 break-inside-avoid"
            >
              <AlbumCard {...c} />
            </motion.div>
          ))}
        </div>
      )}
    </>
  )
}
