"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

type Photo = { id: string; thumbUrl: string }

export function AddPhotos({
  albumId,
  inAlbum,
}: {
  albumId: string
  inAlbum: string[]
}) {
  const router = useRouter()
  const [photos, setPhotos] = useState<Photo[]>([])
  const [added, setAdded] = useState<Set<string>>(new Set(inAlbum))
  const [busy, setBusy] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/photos?available=1")
      .then((r) => r.json())
      .then((d) => setPhotos(d.photos ?? []))
      .catch(() => setPhotos([]))
      .finally(() => setLoading(false))
  }, [])

  async function add(photoId: string) {
    setBusy(photoId)
    try {
      const res = await fetch(`/api/albums/${albumId}/photos`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ photoId }),
      })
      if (res.ok) {
        setAdded((s) => new Set(s).add(photoId))
        router.refresh()
      }
    } finally {
      setBusy(null)
    }
  }

  if (loading)
    return <p className="text-ink/50 text-sm">Loading…</p>
  if (photos.length === 0)
    return (
      <p className="text-ink/50 text-sm">
        No unsorted photos — upload above to add photos to this album.
      </p>
    )

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
      {photos.map((p) => {
        const isIn = added.has(p.id)
        return (
          <button
            key={p.id}
            onClick={() => !isIn && add(p.id)}
            disabled={isIn || busy === p.id}
            className="group relative aspect-square overflow-hidden rounded-lg bg-paper-200 disabled:cursor-default"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={p.thumbUrl}
              alt=""
              className="h-full w-full object-cover"
            />
            <span
              className={`absolute inset-0 flex items-center justify-center text-sm font-medium text-paper transition ${
                isIn
                  ? "bg-ink/50"
                  : "bg-ink/0 opacity-0 group-hover:opacity-100 group-hover:bg-ink/40"
              }`}
            >
              {isIn ? "✓ Added" : busy === p.id ? "…" : "+ Add"}
            </span>
          </button>
        )
      })}
    </div>
  )
}
