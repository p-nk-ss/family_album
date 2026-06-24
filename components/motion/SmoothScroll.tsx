"use client"

import { ReactLenis } from "lenis/react"
import { useReducedMotion } from "framer-motion"

/**
 * Buttery momentum scroll via Lenis, mounted at the root. Lenis drives the real
 * scroll position, so framer-motion's `useScroll` (window or element) keeps
 * working on top of it — that's what powers `Parallax` and the reveals.
 *
 * Honors reduced-motion: when the user asks for less motion we skip Lenis
 * entirely and fall back to the browser's native scroll (no smoothing, no RAF
 * loop), per the design prompt's non-negotiable.
 */
export function SmoothScroll({ children }: { children: React.ReactNode }) {
  const reduce = useReducedMotion()

  if (reduce) return <>{children}</>

  return (
    <ReactLenis
      root
      options={{
        lerp: 0.1,
        smoothWheel: true,
        wheelMultiplier: 1,
        touchMultiplier: 1.5,
      }}
    >
      {children}
    </ReactLenis>
  )
}
