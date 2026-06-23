"use client"
import { motion } from "framer-motion"

export function PressableCard({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
