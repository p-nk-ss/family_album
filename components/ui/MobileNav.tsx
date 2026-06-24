"use client"

import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import Link from "next/link"
import { signOut } from "next-auth/react"
import { AnimatePresence, motion } from "framer-motion"
import { Menu, X } from "lucide-react"

type NavUser = { name?: string | null; image?: string | null }

/**
 * Mobile navigation: a standard dropdown anchored under the hamburger.
 *
 * The menu is portalled to <body> and positioned `fixed` from the button's
 * measured rect. Rendered inline it would be trapped by the nav's
 * `backdrop-filter` (which becomes the containing block) and mis-anchored off
 * the right edge — the portal + measured coords keep it reliably on-screen.
 *
 * Closes on item click, the toggle, Escape, or an outside click. Rows ≥44px.
 */
export function MobileNav({ user }: { user?: NavUser | null }) {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [pos, setPos] = useState({ top: 0, right: 0 })
  const btnRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => setMounted(true), [])

  function toggle() {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      setPos({ top: r.bottom + 10, right: window.innerWidth - r.right })
    }
    setOpen((o) => !o)
  }

  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      const t = e.target as Node
      if (
        !btnRef.current?.contains(t) &&
        !menuRef.current?.contains(t)
      )
        setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", onDown)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onDown)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  const item =
    "flex min-h-11 items-center rounded-xl px-3 text-[15px] text-ink/90 transition-colors hover:bg-paper-300 hover:text-terracotta"

  return (
    <div className="sm:hidden">
      <button
        ref={btnRef}
        type="button"
        onClick={toggle}
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        className="-mr-2 flex h-11 w-11 items-center justify-center rounded-full text-ink/80 transition-colors hover:text-ink active:scale-95"
      >
        {open ? <X size={22} aria-hidden /> : <Menu size={22} aria-hidden />}
      </button>

      {mounted &&
        createPortal(
          <AnimatePresence>
            {open && (
              <motion.div
                ref={menuRef}
                initial={{ opacity: 0, scale: 0.96, y: -6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: -6 }}
                transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }}
                style={{
                  position: "fixed",
                  top: pos.top,
                  right: pos.right,
                  transformOrigin: "top right",
                }}
                className="z-50 w-56 max-w-[calc(100vw-1.5rem)] rounded-2xl border border-ink/10 bg-paper p-2 shadow-[0_20px_50px_rgba(0,0,0,0.55)]"
              >
                <Link href="/library" onClick={() => setOpen(false)} className={item}>
                  Library
                </Link>
                <Link
                  href="/on-this-day"
                  onClick={() => setOpen(false)}
                  className={item}
                >
                  On this day
                </Link>

                <div className="my-2 border-t border-ink/10" />

                {user ? (
                  <>
                    <div className="flex items-center gap-2.5 px-3 pb-1 pt-0.5 text-sm text-ink/60">
                      {user.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={user.image}
                          alt=""
                          className="h-7 w-7 rounded-full object-cover"
                        />
                      ) : (
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-terracotta text-xs text-paper">
                          {(user.name ?? "?").charAt(0).toUpperCase()}
                        </span>
                      )}
                      <span className="truncate">{user.name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => signOut({ redirectTo: "/" })}
                      className={`${item} w-full text-terracotta hover:text-terracotta-deep`}
                    >
                      Sign out
                    </button>
                  </>
                ) : (
                  <Link
                    href="/signin"
                    onClick={() => setOpen(false)}
                    className={`${item} text-terracotta`}
                  >
                    Sign in
                  </Link>
                )}
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </div>
  )
}
