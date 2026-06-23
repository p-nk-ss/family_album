"use client"
import { motion } from "framer-motion"

export function FadeIn({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-10%" }}
      transition={{ duration: 0.5 }}
    >
      {children}
    </motion.div>
  )
}
