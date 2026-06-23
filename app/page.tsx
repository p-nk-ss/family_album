"use client"

import Link from "next/link"
import { motion, useReducedMotion, type Variants } from "framer-motion"

export default function Home() {
  const reduce = useReducedMotion()

  const container: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
  }
  const rise: Variants = {
    hidden: reduce ? { opacity: 0 } : { opacity: 0, y: 18 },
    show: {
      opacity: 1,
      y: 0,
      transition: { type: "spring", stiffness: 120, damping: 20 },
    },
  }

  return (
    <main className="relative flex min-h-[calc(100vh-65px)] flex-col items-center justify-center overflow-hidden px-6 text-center">
      {/* warm "evening" glow rising behind the title */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-[70vh] w-[70vh] -translate-x-1/2 -translate-y-[60%] rounded-full opacity-60 blur-[120px]"
        style={{
          background:
            "radial-gradient(circle, rgba(230,168,107,0.22), transparent 70%)",
        }}
      />

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="relative"
      >
        <motion.p
          variants={rise}
          className="mb-7 text-sm uppercase tracking-[0.4em] text-terracotta"
        >
          our family, kept close
        </motion.p>
        <motion.h1
          variants={rise}
          className="font-serif font-light leading-[0.95] tracking-tight"
          style={{ fontSize: "var(--text-display)" }}
        >
          Family Albums
        </motion.h1>
        <motion.p
          variants={rise}
          className="mx-auto mt-7 max-w-md text-lg leading-relaxed text-ink/65"
        >
          A quiet, private home for the photos that matter — kept as albums and
          stories, not an endless feed.
        </motion.p>
        <motion.div variants={rise}>
          <Link
            href="/library"
            className="group mt-11 inline-flex items-center gap-2 rounded-full bg-terracotta px-8 py-3.5 font-medium text-paper shadow-[0_10px_40px_-12px_rgba(230,168,107,0.7)] transition-[transform,background-color] duration-200 ease-out hover:bg-[#f0b478] active:scale-[0.97]"
          >
            Enter the library
            <span className="transition-transform duration-300 ease-out group-hover:translate-x-1">
              →
            </span>
          </Link>
        </motion.div>
      </motion.div>
    </main>
  )
}
