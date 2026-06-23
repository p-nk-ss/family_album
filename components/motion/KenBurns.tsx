"use client"
import { motion, useReducedMotion } from "framer-motion"

export function KenBurns({ src, alt }: { src: string; alt: string }) {
  const reduce = useReducedMotion()
  return (
    <div className="overflow-hidden h-full w-full">
      <motion.img
        src={src}
        alt={alt}
        className="h-full w-full object-cover"
        initial={{ scale: 1 }}
        animate={reduce ? { scale: 1 } : { scale: 1.08 }}
        transition={{
          duration: 18,
          ease: "easeInOut",
          repeat: Infinity,
          repeatType: "reverse",
        }}
      />
    </div>
  )
}
