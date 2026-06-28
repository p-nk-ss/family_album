"use client"

import { useCallback, useEffect, useState } from "react"
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type PanInfo,
} from "framer-motion"
import { ChevronLeft, ChevronRight, X } from "lucide-react"
import { BlurUpImage } from "@/components/motion/BlurUpImage"
import { Reveal } from "@/components/motion/Reveal"
import { PhotoFlip } from "@/components/album/PhotoFlip"

export type StoryPhoto = {
  id: string
  fullUrl: string
  thumbUrl: string
  blurhash: string | null
  width: number | null
  height: number | null
  caption: string | null
}

export function Story({ photos }: { photos: StoryPhoto[] }) {
  const reduce = useReducedMotion()
  const [index, setIndex] = useState<number | null>(null)
  const [direction, setDirection] = useState(0)

  const open = useCallback((i: number) => {
    setIndex(i)
    setDirection(0)
  }, [])
  const close = useCallback(() => setIndex(null), [])
  const go = useCallback(
    (delta: number) => {
      setDirection(delta)
      setIndex((i) =>
        i === null ? i : (i + delta + photos.length) % photos.length,
      )
    },
    [photos.length],
  )

  useEffect(() => {
    if (index === null) return
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close()
      else if (e.key === "ArrowLeft") go(-1)
      else if (e.key === "ArrowRight") go(1)
    }
    window.addEventListener("keydown", onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      window.removeEventListener("keydown", onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [index, close, go])

  const active = index !== null ? photos[index] : null

  function onDragEnd(_: unknown, info: PanInfo) {
    const { offset, velocity } = info
    if (offset.x < -80 || velocity.x < -400) go(1)
    else if (offset.x > 80 || velocity.x > 400) go(-1)
  }

  return (
    <>
      {/* editorial masonry that keeps the curated order and each photo's
          aspect ratio, instead of one tall vertical column */}
      <div className="gap-4 [column-fill:balance] columns-2 lg:columns-3">
        {photos.map((p, i) => (
          // NOTE: thumbnails deliberately carry NO persistent framer transform
          // layer (no Parallax / will-change, no layoutId). BlurUpImage corrects
          // a tile's aspect ratio late (on image load); a transform/compositing
          // layer over a tile that resizes mid-hover is what made photos vanish
          // on slow first load. `Reveal` only animates the entrance once, then
          // settles — safe. Keep it that way.
          <Reveal
            key={p.id}
            delay={Math.min(i, 8) * 0.04}
            className="mb-4 break-inside-avoid"
          >
            <figure>
              <motion.button
                type="button"
                onClick={() => open(i)}
                aria-label="Open photo"
                whileHover={reduce ? undefined : { y: -6 }}
                whileTap={reduce ? undefined : { scale: 0.98 }}
                transition={{ type: "spring", stiffness: 300, damping: 24 }}
                className="block w-full cursor-zoom-in overflow-hidden rounded-xl [box-shadow:var(--glow-photo)]"
              >
                <BlurUpImage
                  src={p.thumbUrl}
                  blurhash={p.blurhash}
                  width={p.width}
                  height={p.height}
                  alt={p.caption ?? ""}
                />
              </motion.button>
              {/* No printed caption under the thumbnail — the note is a secret
                  on the back, revealed by flipping the photo in the viewer. */}
            </figure>
          </Reveal>
        ))}
      </div>

      <AnimatePresence>
        {active && (
          <motion.div
            className="fixed inset-0 z-50 flex flex-col"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
          >
            {/* blurred backdrop over the gallery */}
            <div
              className="absolute inset-0 bg-black/85 backdrop-blur-2xl"
              onClick={close}
            />

            {/* top bar */}
            <div className="relative flex items-center justify-between px-5 py-4 text-sm text-white/60">
              <span className="tabular-nums">
                {(index ?? 0) + 1} / {photos.length}
              </span>
              <button
                type="button"
                onClick={close}
                aria-label="Close"
                className="flex min-h-11 items-center gap-1.5 rounded-full px-3 text-white/70 transition-colors hover:text-white active:scale-95"
              >
                Close <X size={16} aria-hidden />
              </button>
            </div>

            {/* image stage */}
            <div className="relative flex flex-1 items-center justify-center overflow-hidden px-4">
              {photos.length > 1 && (
                <>
                  <NavButton side="left" onClick={() => go(-1)} />
                  <NavButton side="right" onClick={() => go(1)} />
                </>
              )}
              {/* The drag/swipe + enter-exit live on this OUTER wrapper; the
                  flip itself lives INSIDE PhotoFlip, so a tap turns the print
                  over while a horizontal drag still navigates the gallery. */}
              <AnimatePresence custom={direction} mode="popLayout">
                <motion.div
                  key={active.id}
                  custom={direction}
                  drag={photos.length > 1 ? "x" : false}
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.2}
                  onDragEnd={onDragEnd}
                  initial={
                    reduce
                      ? { opacity: 0 }
                      : {
                          opacity: 0,
                          // open (direction 0) = zoom from the click; nav = slide
                          x: direction === 0 ? 0 : direction > 0 ? 80 : -80,
                          scale: direction === 0 ? 0.92 : 1,
                          filter: "blur(6px)",
                        }
                  }
                  animate={{ opacity: 1, x: 0, scale: 1, filter: "blur(0px)" }}
                  exit={
                    reduce
                      ? { opacity: 0 }
                      : {
                          opacity: 0,
                          x: direction > 0 ? -80 : 80,
                          filter: "blur(6px)",
                        }
                  }
                  transition={{ type: "spring", stiffness: 240, damping: 32 }}
                  className="flex max-h-full max-w-full cursor-grab touch-none items-center justify-center active:cursor-grabbing"
                >
                  <PhotoFlip
                    src={active.fullUrl}
                    alt={active.caption ?? ""}
                    caption={active.caption}
                  />
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

function NavButton({
  side,
  onClick,
}: {
  side: "left" | "right"
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={side === "left" ? "Previous photo" : "Next photo"}
      className={`absolute top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white/80 backdrop-blur-md transition-[background-color,transform] duration-200 hover:bg-white/20 active:scale-90 ${
        side === "left" ? "left-3 sm:left-6" : "right-3 sm:right-6"
      }`}
    >
      {side === "left" ? (
        <ChevronLeft size={22} aria-hidden />
      ) : (
        <ChevronRight size={22} aria-hidden />
      )}
    </button>
  )
}
