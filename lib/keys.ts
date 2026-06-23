import { randomUUID } from "node:crypto"

const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
}

export function extensionFor(contentType: string): string {
  const ext = EXT[contentType]
  if (!ext) throw new Error(`Unsupported content type: ${contentType}`)
  return ext
}

export function photoKey(userId: string, contentType: string, id = randomUUID()): string {
  return `photos/${userId}/${id}.${extensionFor(contentType)}`
}

export function thumbKeyFor(originalKey: string): string {
  return originalKey.replace(/^photos\//, "thumbs/")
}
