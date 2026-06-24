"use client"

import { signIn } from "next-auth/react"
import { motion, type Variants } from "framer-motion"
import { ArrowRight } from "lucide-react"

export default function SignInPage() {
  // mirrors the landing hero's entrance so the gate feels like the same front
  // door — static `hidden` so SSR matches first render; reduced-motion drops the
  // translate via the global MotionConfig.
  const container: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
  }
  const rise: Variants = {
    hidden: { opacity: 0, y: 18 },
    show: {
      opacity: 1,
      y: 0,
      transition: { type: "spring", stiffness: 110, damping: 20 },
    },
  }

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 text-center">
      {/* the same warm evening atmosphere as the public door — no imagery */}
      <div aria-hidden className="absolute inset-0 -z-10">
        <div
          className="absolute left-1/2 top-1/2 h-[70vh] w-[70vh] -translate-x-1/2 -translate-y-[55%] rounded-full opacity-60 blur-[120px]"
          style={{
            background:
              "radial-gradient(circle, rgba(230,168,107,0.20), transparent 70%)",
          }}
        />
        <div className="hero-vignette absolute inset-0" />
      </div>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="w-full max-w-sm"
      >
        <motion.p variants={rise} className="eyebrow mb-6">
          our family, kept close
        </motion.p>
        <motion.h1
          variants={rise}
          className="font-serif text-5xl font-light leading-tight tracking-tight"
        >
          Family Albums
        </motion.h1>
        <motion.p variants={rise} className="mx-auto mt-5 max-w-xs text-ink/60">
          A private home for the photos that matter. Sign in to continue.
        </motion.p>

        <motion.button
          variants={rise}
          onClick={() => signIn("google", { callbackUrl: "/library" })}
          className="group mt-10 inline-flex w-full items-center justify-center gap-2 rounded-full bg-terracotta px-6 py-3.5 font-medium text-paper shadow-[0_10px_40px_-12px_rgba(230,168,107,0.7)] transition-[transform,background-color] duration-200 ease-out hover:bg-[#f0b478] active:scale-[0.97]"
        >
          Sign in with Google
          <ArrowRight
            size={18}
            aria-hidden
            className="transition-transform duration-300 ease-out group-hover:translate-x-1"
          />
        </motion.button>

        {process.env.NODE_ENV !== "production" &&
          process.env.NEXT_PUBLIC_DEV_AUTH === "true" && (
          <motion.button
            variants={rise}
            onClick={() => signIn("dev", { callbackUrl: "/library" })}
            className="mt-3 w-full rounded-full border border-ink/15 px-6 py-3 text-sm text-ink/65 transition-colors duration-200 hover:border-ink/30 hover:text-ink/90"
          >
            Dev login (local only)
          </motion.button>
        )}
      </motion.div>
    </main>
  )
}
