import Link from "next/link"
import { prisma } from "@/lib/db"

export const dynamic = "force-dynamic"

export default async function UploadPage() {
  const albums = await prisma.album.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, _count: { select: { albumPhotos: true } } },
  })

  return (
    <main className="max-w-xl mx-auto px-6 py-16">
      <h1 className="font-serif text-4xl mb-3">Add photos</h1>
      <p className="text-ink/60 mb-8">
        Photos live inside an album. Open an album to upload into it, or start a
        new one.
      </p>

      <Link
        href="/albums/new"
        className="inline-block rounded-full bg-terracotta px-6 py-2 text-paper"
      >
        New album
      </Link>

      {albums.length > 0 && (
        <div className="mt-10">
          <h2 className="font-serif text-lg text-ink/70 mb-3">
            Or open an album
          </h2>
          <ul className="divide-y divide-ink/10">
            {albums.map((a) => (
              <li key={a.id}>
                <Link
                  href={`/albums/${a.id}/edit`}
                  className="flex items-baseline justify-between py-3 hover:text-terracotta transition-colors"
                >
                  <span className="font-serif text-xl">{a.title}</span>
                  <span className="text-sm text-ink/60">
                    {a._count.albumPhotos} photos
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </main>
  )
}
