"use client"

import { useEffect, useRef, useState } from "react"
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion"
import type { ReactNode } from "react"

/**
 * Translates its child vertically as it scrolls through the viewport, for depth
 * on hero / chapter covers and large tiles. Driven by framer's `useScroll` over
 * the element, which rides on Lenis-smoothed scroll position.
 *
 * `distance` is the total travel in px across the full pass (negative = child
 * drifts up faster than the page).
 *
 * The DOM structure is identical on the server and on the client's first render
 * (transform starts at 0), so hydration never mismatches. The scroll-driven
 * travel only switches on after mount — and stays off entirely under
 * reduced-motion, making it a true no-op.
 */
export function Parallax({
  children,
  className,
  distance = 80,
}: {
  children: ReactNode
  className?: string
  distance?: number
}) {
  const reduce = useReducedMotion()
  const ref = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  })
  // Off until mounted, and permanently off under reduced-motion.
  const travel = mounted && !reduce ? distance : 0
  const y = useTransform(scrollYProgress, [0, 1], [travel, -travel])

  return (
    <div ref={ref} className={className}>
      <motion.div style={{ y }} className="h-full w-full will-change-transform">
        {children}
      </motion.div>
    </div>
  )
}
