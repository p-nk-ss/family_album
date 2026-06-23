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
    <main className="max-w-xl mx-auto px-6 py-16">
      <h1 className="font-serif text-4xl mb-8">New album</h1>
      <form action={createAlbum} className="space-y-4">
        <input
          name="title"
          placeholder="Title"
          required
          className="w-full border-b border-ink/20 bg-transparent py-2 text-2xl font-serif outline-none"
        />
        <textarea
          name="description"
          placeholder="Tell the story…"
          rows={5}
          className="w-full border border-ink/20 rounded-lg bg-transparent p-3 outline-none"
        />
        <button
          type="submit"
          className="rounded-full bg-terracotta px-6 py-2 text-paper"
        >
          Create
        </button>
      </form>
    </main>
  )
}
