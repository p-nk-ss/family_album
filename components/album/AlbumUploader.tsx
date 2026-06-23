"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { uploadPhotoFile } from "@/lib/upload-client"

export function AlbumUploader({ albumId }: { albumId: string }) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(
    null,
  )
  const [error, setError] = useState<string | null>(null)

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return
    setBusy(true)
    setError(null)
    setProgress({ done: 0, total: files.length })
    try {
      for (let i = 0; i < files.length; i++) {
        const { photoId } = await uploadPhotoFile(files[i])
        const res = await fetch(`/api/albums/${albumId}/photos`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ photoId }),
        })
        if (!res.ok) {
          throw new Error(
            (await res.json().catch(() => null))?.error ??
              "Could not add photo to album",
          )
        }
        setProgress({ done: i + 1, total: files.length })
      }
      if (inputRef.current) inputRef.current.value = ""
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3">
      <label className="inline-flex cursor-pointer items-center rounded-full bg-terracotta px-6 py-2 text-paper">
        {busy ? "Uploading…" : "Choose photos"}
        <input
          ref={inputRef}
          type="file"
          name="file"
          accept="image/*"
          multiple
          onChange={handleFiles}
          disabled={busy}
          className="hidden"
        />
      </label>
      {progress && busy && (
        <p className="text-sm text-ink/60">
          Uploading {progress.done}/{progress.total}…
        </p>
      )}
      {progress && !busy && !error && progress.done > 0 && (
        <p data-testid="upload-done" className="text-sm text-terracotta">
          Added {progress.done} photo{progress.done > 1 ? "s" : ""} ✓
        </p>
      )}
      {error && <p className="text-sm text-red-700">{error}</p>}
    </div>
  )
}
