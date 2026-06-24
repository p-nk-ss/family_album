"use client"

import { motion } from "framer-motion"
import type { ReactNode } from "react"

/**
 * In-view fade + rise. The shared scroll-reveal used across the library and
 * album story so every section enters with one consistent motion instead of the
 * ad-hoc `whileInView` blocks that were scattered around.
 *
 * The `initial` is static (no `useReducedMotion` branch) so SSR and the client's
 * first render are identical — hydration never mismatches. Reduced-motion is
 * handled globally by `MotionConfig reducedMotion="user"`, which drops the
 * translate and leaves an opacity-only fade.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  y = 24,
  once = true,
}: {
  children: ReactNode
  className?: string
  /** stagger offset in seconds */
  delay?: number
  /** rise distance in px (dropped under reduced-motion by MotionConfig) */
  y?: number
  once?: boolean
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, margin: "-60px" }}
      transition={{ type: "spring", stiffness: 160, damping: 24, delay }}
    >
      {children}
    </motion.div>
  )
}
