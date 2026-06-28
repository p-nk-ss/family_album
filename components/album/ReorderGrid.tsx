"use client"

import { Reorder, useDragControls } from "framer-motion"
import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Check, GripVertical, Star, Trash2 } from "lucide-react"

type Item = { photoId: string; thumbUrl: string; caption: string | null }

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
      className="space-y-2"
    >
      {items.map((item, idx) => (
        <PhotoRow
          key={item.photoId}
          item={item}
          idx={idx}
          isCover={item.photoId === cover}
          onMakeCover={() => makeCover(item.photoId)}
          onRemove={() => removePhoto(item.photoId)}
        />
      ))}
    </Reorder.Group>
  )
}

function PhotoRow({
  item,
  idx,
  isCover,
  onMakeCover,
  onRemove,
}: {
  item: Item
  idx: number
  isCover: boolean
  onMakeCover: () => void
  onRemove: () => void
}) {
  // Only the grip starts a drag (dragListener=false), so the note input below
  // is freely editable without the row picking up the pointer as a drag.
  const controls = useDragControls()
  const [caption, setCaption] = useState(item.caption ?? "")
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [])

  function save(value: string) {
    void fetch(`/api/photos/${item.photoId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ caption: value }),
    })
  }

  function onChange(value: string) {
    setCaption(value)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => save(value), 600)
  }

  function flush() {
    if (timer.current) {
      clearTimeout(timer.current)
      timer.current = null
    }
    save(caption)
  }

  return (
    <Reorder.Item
      value={item}
      dragListener={false}
      dragControls={controls}
      whileDrag={{ scale: 1.02, boxShadow: "0 16px 40px rgba(0,0,0,0.5)" }}
      className="group flex flex-col gap-2.5 rounded-xl border border-transparent bg-paper-200/60 p-2.5 transition-colors hover:bg-paper-200 sm:gap-3"
    >
      <div className="flex items-center gap-3 sm:gap-4">
        <GripVertical
          size={18}
          aria-hidden
          onPointerDown={(e) => controls.start(e)}
          className="shrink-0 cursor-grab touch-none text-ink/25 transition-colors group-hover:text-ink/45 active:cursor-grabbing"
        />
        <span className="w-6 shrink-0 text-center text-sm tabular-nums text-ink/35">
          {String(idx + 1).padStart(2, "0")}
        </span>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.thumbUrl}
          alt=""
          draggable={false}
          className={`h-16 w-24 shrink-0 rounded-lg object-cover ${
            isCover ? "ring-2 ring-terracotta ring-offset-2 ring-offset-paper" : ""
          }`}
        />

        <div className="ml-auto flex items-center gap-1">
          {isCover ? (
            <span className="flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-terracotta">
              <Check size={15} aria-hidden /> Cover
            </span>
          ) : (
            <button
              onClick={onMakeCover}
              className="flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm text-ink/55 transition-colors hover:bg-ink/5 hover:text-terracotta"
            >
              <Star size={14} aria-hidden /> Set as cover
            </button>
          )}
          <button
            onClick={onRemove}
            aria-label="Delete photo"
            className="flex h-11 w-11 items-center justify-center rounded-full text-ink/40 transition-colors hover:bg-danger/10 hover:text-danger"
          >
            <Trash2 size={16} aria-hidden />
          </button>
        </div>
      </div>

      {/* The note: shown on the back of the print when flipped in the viewer. */}
      <input
        value={caption}
        onChange={(e) => onChange(e.target.value)}
        onBlur={flush}
        maxLength={2000}
        placeholder="Add a note for the back of this photo…"
        className="w-full border-b border-ink/15 bg-transparent py-2 pl-9 text-sm outline-none transition-colors placeholder:text-ink/45 focus:border-terracotta"
      />
    </Reorder.Item>
  )
}
