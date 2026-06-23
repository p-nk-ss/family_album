"use client"

async function loadBitmap(file: File): Promise<ImageBitmap> {
  // createImageBitmap honors EXIF orientation when supported.
  return createImageBitmap(file, { imageOrientation: "from-image" } as ImageBitmapOptions)
}

export async function makeThumbnail(
  file: File,
  maxEdge = 600
): Promise<{
  blob: Blob
  width: number
  height: number
  sourceWidth: number
  sourceHeight: number
}> {
  const bitmap = await loadBitmap(file)
  // bitmap dims are already orientation-corrected (imageOrientation: from-image),
  // so they are the TRUE display dimensions — unlike raw EXIF width/height.
  const sourceWidth = bitmap.width
  const sourceHeight = bitmap.height
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height))
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)
  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, width, height)
  const blob = await new Promise<Blob>((resolve) =>
    canvas.toBlob((b) => resolve(b!), "image/jpeg", 0.8)
  )
  return { blob, width, height, sourceWidth, sourceHeight }
}

export async function smallPixels(
  file: File,
  size = 32
): Promise<{ pixels: Uint8ClampedArray; width: number; height: number }> {
  const bitmap = await loadBitmap(file)
  const scale = Math.min(1, size / Math.max(bitmap.width, bitmap.height))
  const width = Math.max(1, Math.round(bitmap.width * scale))
  const height = Math.max(1, Math.round(bitmap.height * scale))
  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext("2d")!
  ctx.drawImage(bitmap, 0, 0, width, height)
  return { pixels: ctx.getImageData(0, 0, width, height).data, width, height }
}
