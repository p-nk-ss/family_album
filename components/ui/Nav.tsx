import Link from "next/link"
import { auth, signOut } from "@/lib/auth"

export async function Nav() {
  const session = await auth()
  const user = session?.user

  return (
    <nav className="sticky top-0 z-40 flex items-center justify-between border-b border-ink/10 bg-paper/70 px-6 py-4 backdrop-blur-xl backdrop-saturate-150">
      <Link href="/" className="group flex items-center gap-2.5">
        <span className="h-2 w-2 rounded-full bg-terracotta transition-transform duration-300 group-hover:scale-125" />
        <span className="font-serif text-xl tracking-tight">Family Albums</span>
      </Link>
      <div className="flex items-center gap-6 text-sm text-ink/70">
        <Link href="/library" className="hover:text-ink transition-colors">
          Library
        </Link>
        <Link href="/on-this-day" className="hover:text-ink transition-colors">
          On this day
        </Link>
        {user ? (
          <div className="flex items-center gap-2 pl-3 border-l border-ink/10">
            {user.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.image}
                alt=""
                className="h-7 w-7 rounded-full object-cover"
              />
            ) : (
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-terracotta text-paper text-xs">
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
                className="text-ink/40 hover:text-terracotta transition-colors"
              >
                Sign out
              </button>
            </form>
          </div>
        ) : (
          <Link href="/signin" className="text-terracotta">
            Sign in
          </Link>
        )}
      </div>
    </nav>
  )
}
