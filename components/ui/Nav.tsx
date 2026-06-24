import Link from "next/link"
import { auth, signOut } from "@/lib/auth"
import { MobileNav } from "./MobileNav"

export async function Nav() {
  const session = await auth()
  const user = session?.user

  return (
    <nav className="sticky top-0 z-40 flex items-center justify-between border-b border-ink/10 bg-paper/70 px-6 py-3 backdrop-blur-xl backdrop-saturate-150">
      <Link href="/" className="group flex min-h-11 items-center gap-2.5">
        <span className="h-2 w-2 rounded-full bg-terracotta transition-transform duration-300 group-hover:scale-125" />
        <span className="font-serif text-xl tracking-tight">Family Albums</span>
      </Link>

      {/* desktop row — every item ≥44px tall for touch */}
      <div className="hidden items-center gap-1 text-sm text-ink/70 sm:flex">
        <Link
          href="/library"
          className="flex min-h-11 items-center px-3 transition-colors hover:text-ink"
        >
          Library
        </Link>
        <Link
          href="/on-this-day"
          className="flex min-h-11 items-center px-3 transition-colors hover:text-ink"
        >
          On this day
        </Link>
        {user ? (
          <div className="ml-1 flex items-center gap-2 border-l border-ink/10 pl-3">
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
            <span className="text-ink/70">{user.name}</span>
            <form
              action={async () => {
                "use server"
                await signOut({ redirectTo: "/" })
              }}
            >
              <button
                type="submit"
                className="flex min-h-11 items-center px-2 text-ink/60 transition-colors hover:text-terracotta"
              >
                Sign out
              </button>
            </form>
          </div>
        ) : (
          <Link
            href="/signin"
            className="flex min-h-11 items-center px-3 text-terracotta"
          >
            Sign in
          </Link>
        )}
      </div>

      {/* mobile hamburger + dropdown */}
      <MobileNav user={user ? { name: user.name, image: user.image } : null} />
    </nav>
  )
}
