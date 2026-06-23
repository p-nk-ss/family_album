import Link from "next/link"

export function Nav() {
  return (
    <nav className="flex items-center justify-between px-6 py-4 border-b border-ink/10">
      <Link href="/" className="font-serif text-xl">
        Family Albums
      </Link>
      <div className="flex gap-6 text-sm">
        <Link href="/library">Library</Link>
        <Link href="/on-this-day">On this day</Link>
        <Link href="/upload">Upload</Link>
      </div>
    </nav>
  )
}
