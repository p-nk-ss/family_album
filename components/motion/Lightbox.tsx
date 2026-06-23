"use client"
import { motion, useReducedMotion } from "framer-motion"

export function Lightbox({
  src,
  alt,
  photoId,
}: {
  src: string
  alt: string
  photoId: string
}) {
  const reduce = useReducedMotion()
  return (
    <motion.img
      src={src}
      alt={alt}
      style={{ viewTransitionName: `photo-${photoId}` }}
      initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
      animate={reduce ? { opacity: 1 } : { opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 30 }}
      className="max-h-[85vh] w-auto mx-auto rounded-lg"
    />
  )
}
