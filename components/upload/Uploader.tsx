"use client"

import { useState } from "react"
import Link from "next/link"
import { makeThumbnail, smallPixels } from "@/lib/image-client"
import { encodeBlurhash } from "@/lib/blurhash"
import { parseExif } from "@/lib/exif"

export function Uploader() {
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const input = e.currentTarget.elements.namedItem("file") as HTMLInputElement
    const file = input.files?.[0]
    if (!file) return
    setBusy(true)
    setError(null)
    setDone(false)
    try {
      const [thumb, px, exif] = await Promise.all([
        makeThumbnail(file),
        smallPixels(file),
        parseExif(file),
      ])
      const blurhash = encodeBlurhash(px.pixels, px.width, px.height)

      const signRes = await fetch("/api/upload-url", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ filename: file.name, contentType: file.type, sizeBytes: file.size }),
      })
      if (!signRes.ok) throw new Error((await signRes.json()).error ?? "sign failed")
      const { originalUrl, originalKey, thumbUrl, thumbKey } = await signRes.json()

      await Promise.all([
        fetch(originalUrl, { method: "PUT", headers: { "content-type": file.type }, body: file }),
        fetch(thumbUrl, { method: "PUT", headers: { "content-type": "image/jpeg" }, body: thumb.blob }),
      ])

      const metaRes = await fetch("/api/photos", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          r2Key: originalKey,
          thumbKey,
          contentType: file.type,
          sizeBytes: file.size,
          width: exif.width,
          height: exif.height,
          takenAt: exif.takenAt,
          blurhash,
        }),
      })
      if (!metaRes.ok) throw new Error((await metaRes.json()).error ?? "save failed")
      setPreview(URL.createObjectURL(thumb.blob))
      setDone(true)
      input.value = ""
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed")
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input type="file" name="file" accept="image/*" required />
      <button
        type="submit"
        disabled={busy}
        className="rounded-full bg-terracotta px-6 py-2 text-paper disabled:opacity-50"
      >
        {busy ? "Uploading…" : "Upload"}
      </button>
      {error && <p className="text-red-700 text-sm">{error}</p>}
      {done && (
        <div
          data-testid="upload-done"
          className="flex items-center gap-4 rounded-lg bg-paper-200 p-4"
        >
          {preview && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview}
              alt=""
              className="h-16 w-16 rounded object-cover"
            />
          )}
          <div className="space-y-1 text-sm">
            <p className="text-terracotta font-medium">Saved to your library ✓</p>
            <p className="text-ink/60">
              Add it to{" "}
              <Link href="/albums/new" className="text-terracotta underline">
                a new album
              </Link>{" "}
              or an existing one&rsquo;s editor.
            </p>
          </div>
        </div>
      )}
    </form>
  )
}
