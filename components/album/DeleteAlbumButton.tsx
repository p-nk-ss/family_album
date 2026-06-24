"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export function DeleteAlbumButton({ albumId }: { albumId: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    if (
      !confirm(
        "Delete this album and all its photos? This cannot be undone.",
      )
    )
      return
    setBusy(true)
    setError(null)
    const res = await fetch(`/api/albums/${albumId}`, { method: "DELETE" })
    if (res.ok) {
      router.push("/library")
      router.refresh()
      return
    }
    setBusy(false)
    setError(
      res.status === 403
        ? "Only the album's creator can delete it."
        : "Could not delete the album.",
    )
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handleDelete}
        disabled={busy}
        className="flex min-h-11 items-center text-sm text-danger transition-opacity hover:underline disabled:opacity-50"
      >
        {busy ? "Deleting…" : "Delete album"}
      </button>
      {error && (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
