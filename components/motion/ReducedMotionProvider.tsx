"use client"
import { MotionConfig, LazyMotion, domMax } from "framer-motion"

export function ReducedMotionProvider({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <LazyMotion features={domMax}>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  )
}
