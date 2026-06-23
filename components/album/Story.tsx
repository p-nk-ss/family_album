"use client"

import { useCallback, useEffect, useState } from "react"
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type PanInfo,
} from "framer-motion"
import { BlurUpImage } from "@/components/motion/BlurUpImage"
import { CommentThread } from "@/components/comments/CommentThread"

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
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const [direction, setDirection] = useState(0)

  const open = useCallback((i: number) => {
    setIndex(i)
    setOpenIndex(i)
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
  // Shared-element morph only for the photo that was clicked to open (and to
  // close back into it). Navigation between photos uses a momentum slide.
  const morph = !reduce && index !== null && index === openIndex

  function onDragEnd(_: unknown, info: PanInfo) {
    const { offset, velocity } = info
    if (offset.x < -80 || velocity.x < -400) go(1)
    else if (offset.x > 80 || velocity.x > 400) go(-1)
  }

  return (
    <>
      <div className="space-y-20 sm:space-y-28">
        {photos.map((p, i) => (
          <motion.figure
            key={p.id}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ type: "spring", stiffness: 90, damping: 20 }}
          >
            <motion.button
              type="button"
              layoutId={reduce ? undefined : `ph-${p.id}`}
              onClick={() => open(i)}
              aria-label="Open photo"
              className="block w-full cursor-zoom-in overflow-hidden rounded-xl [box-shadow:var(--glow-photo)] transition-transform duration-500 ease-out hover:-translate-y-1"
              style={{ opacity: index === i ? 0 : 1 }}
            >
              <BlurUpImage
                src={p.thumbUrl}
                blurhash={p.blurhash}
                width={p.width}
                height={p.height}
                alt={p.caption ?? ""}
              />
            </motion.button>
            {p.caption && (
              <figcaption className="mt-4 text-center font-serif text-lg italic text-ink/55">
                {p.caption}
              </figcaption>
            )}
          </motion.figure>
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
                className="rounded-full px-3 py-1 text-white/70 transition-colors hover:text-white active:scale-95"
              >
                Close ✕
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
              <AnimatePresence custom={direction} mode="popLayout">
                <motion.img
                  key={active.id}
                  layoutId={morph ? `ph-${active.id}` : undefined}
                  src={active.fullUrl}
                  alt={active.caption ?? ""}
                  custom={direction}
                  drag={photos.length > 1 ? "x" : false}
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.2}
                  onDragEnd={onDragEnd}
                  initial={
                    morph
                      ? false
                      : reduce
                        ? { opacity: 0 }
                        : {
                            opacity: 0,
                            x: direction > 0 ? 80 : -80,
                            filter: "blur(6px)",
                          }
                  }
                  animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
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
                  className="max-h-full max-w-full cursor-grab touch-none rounded-lg object-contain shadow-2xl active:cursor-grabbing"
                  style={{ viewTransitionName: `photo-${active.id}` }}
                  draggable={false}
                />
              </AnimatePresence>
            </div>

            {/* caption + comments panel */}
            <div className="relative mx-auto max-h-[38vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl border-t border-white/10 bg-paper/80 px-6 py-5 backdrop-blur-xl">
              {active.caption && (
                <p className="mb-4 font-serif text-lg italic text-ink/80">
                  {active.caption}
                </p>
              )}
              <CommentThread photoId={active.id} />
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
      className={`absolute top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-lg text-white/80 backdrop-blur-md transition-[background-color,transform] duration-200 hover:bg-white/20 active:scale-90 ${
        side === "left" ? "left-3 sm:left-6" : "right-3 sm:right-6"
      }`}
    >
      {side === "left" ? "‹" : "›"}
    </button>
  )
}
