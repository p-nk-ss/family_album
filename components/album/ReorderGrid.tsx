"use client"

import { Reorder } from "framer-motion"
import { useState } from "react"
import { useRouter } from "next/navigation"

type Item = { photoId: string; thumbUrl: string }

export function ReorderGrid({
  albumId,
  initial,
  coverPhotoId,
}: {
  albumId: string
  initial: Item[]
  coverPhotoId?: string | null
}) {
  const router = useRouter()
  const [items, setItems] = useState(initial)
  const [cover, setCover] = useState<string | null>(coverPhotoId ?? null)

  async function persist(next: Item[]) {
    setItems(next)
    await fetch(`/api/albums/${albumId}/photos`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ orderedPhotoIds: next.map((i) => i.photoId) }),
    })
    router.refresh()
  }

  async function makeCover(photoId: string) {
    const res = await fetch(`/api/albums/${albumId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ coverPhotoId: photoId }),
    })
    if (res.ok) {
      setCover(photoId)
      router.refresh()
    }
  }

  async function removePhoto(photoId: string) {
    if (!confirm("Delete this photo? It will be removed permanently.")) return
    const res = await fetch(`/api/photos/${photoId}`, { method: "DELETE" })
    if (res.ok) {
      setItems((prev) => prev.filter((i) => i.photoId !== photoId))
      if (cover === photoId) setCover(null)
      router.refresh()
    }
  }

  return (
    <Reorder.Group
      axis="y"
      values={items}
      onReorder={persist}
      className="space-y-3"
    >
      {items.map((item) => {
        const isCover = item.photoId === cover
        return (
          <Reorder.Item
            key={item.photoId}
            value={item}
            whileDrag={{ scale: 1.03, boxShadow: "0 12px 30px rgba(0,0,0,0.15)" }}
            className="flex items-center gap-4 rounded-lg bg-paper-200 p-2 cursor-grab active:cursor-grabbing"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.thumbUrl}
              alt=""
              className={`h-16 w-16 rounded object-cover ${isCover ? "ring-2 ring-terracotta ring-offset-2 ring-offset-paper-200" : ""}`}
            />
            {isCover ? (
              <span className="text-sm font-medium text-terracotta">
                ✓ Cover
              </span>
            ) : (
              <button
                onClick={() => makeCover(item.photoId)}
                className="text-sm text-ink/60 hover:text-terracotta transition-colors"
              >
                Set as cover
              </button>
            )}
            <button
              onClick={() => removePhoto(item.photoId)}
              aria-label="Delete photo"
              className="ml-auto text-sm text-ink/40 hover:text-red-700 transition-colors"
            >
              Delete
            </button>
          </Reorder.Item>
        )
      })}
    </Reorder.Group>
  )
}
