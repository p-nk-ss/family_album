"use client"

import { useState } from "react"
import { motion, useReducedMotion } from "framer-motion"

/**
 * A photo that flips like a real print: tap it and it turns over to reveal the
 * note written on the back — aged cream paper, handwriting tilted off the
 * horizon. Only photos that actually have a note flip; the rest behave as a
 * plain image. A peeling dog-ear corner signals "there's something to read."
 *
 * Drag/swipe is intentionally NOT owned here — the gallery wraps this in its own
 * draggable element, so a tap flips while a horizontal drag still navigates.
 *
 * Sizing: the <img> is bounded by the viewport (max-h/max-w) with object-contain,
 * so it never depends on a parent having a definite height — and every wrapper is
 * inline so it shrink-wraps the photo, which keeps the absolutely-positioned back
 * face the exact same size as the front.
 *
 * Reduced motion: no 3D rotation — the two faces crossfade instead
 * (DESIGN_PROMPT non-negotiable).
 */
export function PhotoFlip({
  src,
  alt,
  caption,
}: {
  src: string
  alt: string
  caption: string | null
}) {
  const reduce = useReducedMotion()
  const [flipped, setFlipped] = useState(false)
  // Until the photo has real dimensions its wrapper collapses to ~0, which would
  // strand the dog-ear near screen center over the black loading ground. Gate the
  // corner on a genuine load; the ref handles already-cached images (no onLoad).
  const [loaded, setLoaded] = useState(false)
  const canFlip = Boolean(caption && caption.trim())
  // No reset-on-src effect needed: the gallery remounts this per photo
  // (key={active.id}), so state starts fresh on every photo.

  const image = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      draggable={false}
      ref={(el) => {
        if (el && el.complete && el.naturalWidth > 0) setLoaded(true)
      }}
      onLoad={() => setLoaded(true)}
      className="block max-h-[85vh] max-w-[90vw] rounded-xl object-contain shadow-2xl"
    />
  )

  // No note → just the photo, no flip, no dog-ear.
  if (!canFlip) {
    return <div className="relative inline-flex">{image}</div>
  }

  const front = (
    <div className="group relative inline-block [backface-visibility:hidden]">
      {image}
      {/* peeling dog-ear: the affordance that a note waits on the back.
          Only once the photo is painted, so it never floats over a blank load. */}
      {loaded && <span aria-hidden className="photo-dogear" />}
    </div>
  )

  // A touch of natural variance so every note isn't tilted identically — derived
  // from the caption so it stays stable across renders (no layout-shifting jitter).
  const tilt = -3.4 + ((caption ?? "").length % 4) * 0.8
  const note = (
    <p
      className="photo-note-ink max-w-[30ch] text-left font-hand text-3xl leading-snug sm:text-4xl"
      style={{ transform: `rotate(${tilt}deg)` }}
    >
      {caption}
    </p>
  )

  const label = flipped ? "Flip photo to front" : "Read the note on the back"

  // Reduced motion: crossfade the faces, no perspective/rotation.
  if (reduce) {
    return (
      <motion.button
        type="button"
        onClick={() => setFlipped((f) => !f)}
        aria-pressed={flipped}
        aria-label={label}
        className="relative inline-flex cursor-pointer"
      >
        <motion.span
          className="inline-flex"
          animate={{ opacity: flipped ? 0 : 1 }}
          transition={{ duration: 0.18 }}
        >
          {front}
        </motion.span>
        <motion.span
          className="photo-note absolute inset-0 flex items-start justify-start rounded-xl px-8 py-10 sm:px-12 sm:py-12"
          animate={{ opacity: flipped ? 1 : 0 }}
          transition={{ duration: 0.18 }}
          style={{ pointerEvents: flipped ? "auto" : "none" }}
        >
          {note}
        </motion.span>
      </motion.button>
    )
  }

  return (
    <div className="relative inline-flex [perspective:1600px]">
      <motion.button
        type="button"
        onClick={() => setFlipped((f) => !f)}
        aria-pressed={flipped}
        aria-label={label}
        className="relative inline-flex cursor-pointer [transform-style:preserve-3d]"
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 26 }}
      >
        {front}
        <span className="photo-note absolute inset-0 flex items-start justify-start rounded-xl px-8 py-10 [backface-visibility:hidden] [transform:rotateY(180deg)] sm:px-12 sm:py-12">
          {note}
        </span>
      </motion.button>
    </div>
  )
}
