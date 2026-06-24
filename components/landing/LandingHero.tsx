"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type Variants,
} from "framer-motion"
import { ArrowRight, ChevronDown } from "lucide-react"
import { Parallax } from "@/components/motion/Parallax"

/**
 * The signature front door: an oversized Fraunces title over a slow cross-fading
 * montage of recent covers (Ken Burns drift + parallax), warm vignette + grain.
 * Logged-out visitors get the same atmospheric hero with NO photos — `covers`
 * arrives empty from the server, so nothing private renders.
 */
export function LandingHero({
  covers,
  signedIn,
}: {
  covers: string[]
  signedIn: boolean
}) {
  const reduce = useReducedMotion()
  const [i, setI] = useState(0)
  // The montage is a client-only cross-fade (AnimatePresence + parallax). Gating
  // it behind mount keeps it out of the SSR tree, so there's no hydration
  // mismatch — it simply fades in once hydrated.
  const [mounted, setMounted] = useState(false)
  const hasMontage = mounted && covers.length > 0

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (reduce || covers.length < 2) return
    const t = setInterval(() => setI((p) => (p + 1) % covers.length), 6000)
    return () => clearInterval(t)
  }, [reduce, covers.length])

  const container: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.12, delayChildren: 0.15 } },
  }
  // static `hidden` (no reduce branch) → SSR matches the client's first render;
  // reduced-motion drops the translate via the global MotionConfig.
  const rise: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: {
      opacity: 1,
      y: 0,
      transition: { type: "spring", stiffness: 110, damping: 20 },
    },
  }

  return (
    <section className="relative flex min-h-[calc(100svh-60px)] flex-col items-center justify-center overflow-hidden px-6 text-center">
      {/* atmosphere layer (behind everything) */}
      <div aria-hidden className="absolute inset-0 -z-10">
        {hasMontage && (
          // inflated box so the parallax translate never reveals an edge
          <Parallax distance={50} className="absolute inset-x-0 -top-[8%] h-[116%]">
            <AnimatePresence>
              <motion.img
                key={covers[i]}
                src={covers[i]}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
                initial={{ opacity: 0, scale: reduce ? 1 : 1.06 }}
                animate={{ opacity: 1, scale: reduce ? 1 : 1.14 }}
                exit={{ opacity: 0 }}
                transition={{
                  opacity: { duration: 1.6, ease: "easeInOut" },
                  scale: { duration: 7, ease: "easeOut" },
                }}
              />
            </AnimatePresence>
          </Parallax>
        )}

        {/* warm evening glow — present with or without photos */}
        <div
          className="absolute left-1/2 top-1/2 h-[70vh] w-[70vh] -translate-x-1/2 -translate-y-[55%] rounded-full opacity-60 blur-[120px]"
          style={{
            background:
              "radial-gradient(circle, rgba(230,168,107,0.20), transparent 70%)",
          }}
        />
        {/* extra darken over photos so the type always wins */}
        {hasMontage && <div className="absolute inset-0 bg-paper/45" />}
        {/* cinematic vignette seats the image into the dark ground */}
        <div className="hero-vignette absolute inset-0" />
      </div>

      {/* foreground content */}
      <motion.div variants={container} initial="hidden" animate="show" className="relative">
        <motion.p variants={rise} className="eyebrow mb-7">
          our family, kept close
        </motion.p>
        <motion.h1 variants={rise} className="text-hero font-serif">
          Family Albums
        </motion.h1>
        <motion.p
          variants={rise}
          className="mx-auto mt-8 max-w-md text-lg leading-relaxed text-ink/65"
        >
          A quiet, private home for the photos that matter — kept as albums and
          stories, not an endless feed.
        </motion.p>
        <motion.div variants={rise}>
          <Link
            href={signedIn ? "/library" : "/signin"}
            className="group mt-11 inline-flex items-center gap-2 rounded-full bg-terracotta px-8 py-3.5 font-medium text-paper shadow-[0_10px_40px_-12px_rgba(230,168,107,0.7)] transition-[transform,background-color] duration-200 ease-out hover:bg-[#f0b478] active:scale-[0.97]"
          >
            {signedIn ? "Enter the library" : "Sign in"}
            <ArrowRight
              size={18}
              aria-hidden
              className="transition-transform duration-300 ease-out group-hover:translate-x-1"
            />
          </Link>
        </motion.div>
      </motion.div>

      {/* scroll cue (hidden under reduced motion) */}
      {signedIn && (
        <motion.div
          aria-hidden
          className="absolute bottom-8 left-1/2 -translate-x-1/2 text-ink/55"
          initial={{ opacity: 0 }}
          animate={{ opacity: reduce ? 0 : 1 }}
          transition={{ delay: 1.4, duration: 0.8 }}
        >
          <motion.span
            className="block"
            animate={reduce ? {} : { y: [0, 6, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          >
            <ChevronDown size={22} aria-hidden />
          </motion.span>
        </motion.div>
      )}
    </section>
  )
}
