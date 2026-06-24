"use client"

import { motion } from "framer-motion"
import { Parallax } from "@/components/motion/Parallax"
import { KenBurns } from "@/components/motion/KenBurns"

/**
 * The album opens like turning a heavy page: a large title set over its cover
 * (Ken Burns drift + scroll parallax), a scrim for legibility, then the masonry
 * flows beneath. Slow `ease-hero` entrance so it lands with weight.
 */
export function ChapterCover({
  title,
  description,
  meta,
  coverUrl,
}: {
  title: string
  description: string | null
  meta: string | null
  coverUrl: string | null
}) {
  // Entrance transforms are static here (no reduced-motion branch) so SSR and
  // the client's first render match; reduced-motion is neutralised globally by
  // MotionConfig, leaving an opacity-only fade-in.
  const ease = [0.16, 1, 0.3, 1] as const

  return (
    <section className="relative h-[72svh] min-h-[440px] w-full overflow-hidden">
      {coverUrl ? (
        // inflated box so the parallax travel never reveals an edge
        <Parallax distance={60} className="absolute -inset-y-16 inset-x-0">
          <KenBurns src={coverUrl} alt="" />
        </Parallax>
      ) : (
        <div className="absolute inset-0 bg-paper-200" />
      )}

      {/* legibility scrim + cinematic vignette that fades into the page ground */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-paper via-paper/25 to-black/35" />
      <div className="hero-vignette pointer-events-none absolute inset-0" />

      <div className="absolute inset-x-0 bottom-0 px-6 pb-12 sm:pb-16">
        <div className="mx-auto max-w-5xl">
          {meta && (
            <motion.p
              className="eyebrow mb-4"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease, delay: 0.15 }}
            >
              {meta}
            </motion.p>
          )}
          <motion.h1
            className="text-hero max-w-4xl font-serif text-white"
            initial={{ opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease, delay: 0.2 }}
          >
            {title}
          </motion.h1>
          {description && (
            <motion.p
              className="mt-5 max-w-xl whitespace-pre-line text-lg leading-relaxed text-white/75"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease, delay: 0.32 }}
            >
              {description}
            </motion.p>
          )}
        </div>
      </div>
    </section>
  )
}
