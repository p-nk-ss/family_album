"use client"

import { SessionProvider } from "next-auth/react"
import { ReducedMotionProvider } from "@/components/motion/ReducedMotionProvider"
import { SmoothScroll } from "@/components/motion/SmoothScroll"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ReducedMotionProvider>
        <SmoothScroll>{children}</SmoothScroll>
      </ReducedMotionProvider>
    </SessionProvider>
  )
}
