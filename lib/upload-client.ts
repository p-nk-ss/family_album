import { makeThumbnail, smallPixels } from "@/lib/image-client"
import { encodeBlurhash } from "@/lib/blurhash"
import { parseExif } from "@/lib/exif"

/**
 * Browser-side upload pipeline: builds a thumbnail + blurhash + EXIF, signs R2
 * PUTs, uploads original + thumb, then creates the Photo row. Returns the new
 * photo id (and the thumb blob for an optional local preview). Used by both the
 * in-album uploader and any standalone uploader.
 */
export async function uploadPhotoFile(
  file: File,
): Promise<{ photoId: string; thumbBlob: Blob }> {
  const [thumb, px, exif] = await Promise.all([
    makeThumbnail(file),
    smallPixels(file),
    parseExif(file),
  ])
  const blurhash = encodeBlurhash(px.pixels, px.width, px.height)

  const signRes = await fetch("/api/upload-url", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      filename: file.name,
      contentType: file.type,
      sizeBytes: file.size,
    }),
  })
  if (!signRes.ok) throw new Error((await signRes.json()).error ?? "sign failed")
  const { originalUrl, originalKey, thumbUrl, thumbKey } = await signRes.json()

  await Promise.all([
    fetch(originalUrl, {
      method: "PUT",
      headers: { "content-type": file.type },
      body: file,
    }),
    fetch(thumbUrl, {
      method: "PUT",
      headers: { "content-type": "image/jpeg" },
      body: thumb.blob,
    }),
  ])

  const metaRes = await fetch("/api/photos", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      r2Key: originalKey,
      thumbKey,
      contentType: file.type,
      sizeBytes: file.size,
      // orientation-corrected decoded dimensions (EXIF dims ignore rotation)
      width: thumb.sourceWidth ?? exif.width,
      height: thumb.sourceHeight ?? exif.height,
      takenAt: exif.takenAt,
      blurhash,
    }),
  })
  if (!metaRes.ok) throw new Error((await metaRes.json()).error ?? "save failed")
  const { id } = await metaRes.json()
  return { photoId: id as string, thumbBlob: thumb.blob }
}
