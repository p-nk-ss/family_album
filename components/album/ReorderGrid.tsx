"use client"

import { Reorder } from "framer-motion"
import { useState } from "react"

type Item = { photoId: string; thumbUrl: string }

export function ReorderGrid({
  albumId,
  initial,
}: {
  albumId: string
  initial: Item[]
}) {
  const [items, setItems] = useState(initial)

  async function persist(next: Item[]) {
    setItems(next)
    await fetch(`/api/albums/${albumId}/photos`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ orderedPhotoIds: next.map((i) => i.photoId) }),
    })
  }

  async function setCover(photoId: string) {
    await fetch(`/api/albums/${albumId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ coverPhotoId: photoId }),
    })
  }

  return (
    <Reorder.Group
      axis="y"
      values={items}
      onReorder={persist}
      className="space-y-3"
    >
      {items.map((item) => (
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
            className="h-16 w-16 rounded object-cover"
          />
          <button
            onClick={() => setCover(item.photoId)}
            className="text-sm text-terracotta"
          >
            Set as cover
          </button>
        </Reorder.Item>
      ))}
    </Reorder.Group>
  )
}
