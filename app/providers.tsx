"use client"

import { SessionProvider } from "next-auth/react"
import { ReducedMotionProvider } from "@/components/motion/ReducedMotionProvider"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ReducedMotionProvider>{children}</ReducedMotionProvider>
    </SessionProvider>
  )
}
