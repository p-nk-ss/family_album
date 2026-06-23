import { z } from "zod"

export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024
export const ALLOWED_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
] as const

export class ValidationError extends Error {}

export function assertUploadable(input: { contentType: string; sizeBytes: number }): void {
  if (!ALLOWED_CONTENT_TYPES.includes(input.contentType as (typeof ALLOWED_CONTENT_TYPES)[number])) {
    throw new ValidationError(`Unsupported content type: ${input.contentType}`)
  }
  if (!Number.isInteger(input.sizeBytes) || input.sizeBytes <= 0) {
    throw new ValidationError("Invalid file size")
  }
  if (input.sizeBytes > MAX_UPLOAD_BYTES) {
    throw new ValidationError("File exceeds 50 MB limit")
  }
}

export const uploadUrlSchema = z.object({
  filename: z.string().min(1).max(255),
  contentType: z.enum(ALLOWED_CONTENT_TYPES),
  sizeBytes: z.number().int().positive().max(MAX_UPLOAD_BYTES),
})

export const photoMetadataSchema = z.object({
  r2Key: z.string().min(1),
  thumbKey: z.string().min(1).nullable(),
  contentType: z.enum(ALLOWED_CONTENT_TYPES),
  sizeBytes: z.number().int().positive(),
  width: z.number().int().positive().nullable(),
  height: z.number().int().positive().nullable(),
  takenAt: z.string().datetime().nullable(),
  blurhash: z.string().nullable(),
  caption: z.string().max(2000).nullable().optional(),
})
