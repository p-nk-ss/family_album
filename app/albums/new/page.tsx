import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import { requireUser } from "@/lib/session"

async function createAlbum(formData: FormData) {
  "use server"
  const user = await requireUser()
  const title = String(formData.get("title") ?? "").trim()
  if (!title) return
  const description = String(formData.get("description") ?? "").trim()
  const album = await prisma.album.create({
    data: {
      title,
      description: description || null,
      createdById: user.id,
    },
  })
  redirect(`/albums/${album.id}/edit`)
}

export default function NewAlbumPage() {
  return (
    <main className="mx-auto max-w-xl px-6 py-16">
      <Link
        href="/library"
        className="mb-10 inline-flex min-h-11 items-center gap-1.5 text-sm text-ink/60 transition-colors hover:text-terracotta"
      >
        <ArrowLeft size={16} aria-hidden /> Library
      </Link>

      <p className="eyebrow mb-3">a new story</p>
      <h1 className="mb-10 font-serif text-5xl font-light tracking-tight">
        New album
      </h1>

      <form action={createAlbum} className="space-y-6">
        <input
          name="title"
          placeholder="Title"
          required
          autoFocus
          className="w-full border-b border-ink/20 bg-transparent py-2.5 font-serif text-2xl outline-none transition-colors placeholder:text-ink/30 focus:border-terracotta"
        />
        <textarea
          name="description"
          placeholder="Tell the story…"
          rows={5}
          className="w-full rounded-xl border border-ink/15 bg-paper-200/50 p-4 leading-relaxed outline-none transition-colors placeholder:text-ink/30 focus:border-terracotta"
        />
        <button
          type="submit"
          className="rounded-full bg-terracotta px-7 py-3 font-medium text-paper shadow-[0_10px_40px_-12px_rgba(230,168,107,0.7)] transition-[transform,background-color] duration-200 ease-out hover:bg-[#f0b478] active:scale-[0.97]"
        >
          Create album
        </button>
      </form>
    </main>
  )
}
