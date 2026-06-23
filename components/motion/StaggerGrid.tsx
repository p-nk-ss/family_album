"use client"
import { motion, type Variants } from "framer-motion"

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
}

const item: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 220, damping: 28 },
  },
}

export function StaggerGrid({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className={className}
    >
      {Array.isArray(children)
        ? children.map((child, i) => (
            <motion.div key={i} variants={item}>
              {child}
            </motion.div>
          ))
        : <motion.div variants={item}>{children}</motion.div>}
    </motion.div>
  )
}
