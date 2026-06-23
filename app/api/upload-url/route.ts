import { NextResponse } from "next/server"
import { uploadUrlSchema, ValidationError } from "@/lib/validation"
import { photoKey, thumbKeyFor } from "@/lib/keys"
import { presignPut } from "@/lib/r2"

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = uploadUrlSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 })
  }

  // Phase 1: hardcoded userId. Phase 3 will replace this with the session user id.
  const userId = "anon"
  const { contentType, sizeBytes } = parsed.data
  const originalKey = photoKey(userId, contentType)
  const thumbKey = thumbKeyFor(originalKey)

  try {
    const [originalUrl, thumbUrl] = await Promise.all([
      presignPut({ key: originalKey, contentType, contentLength: sizeBytes }),
      presignPut({ key: thumbKey, contentType: "image/jpeg", contentLength: 1 }),
    ])
    return NextResponse.json({ originalUrl, originalKey, thumbUrl, thumbKey })
  } catch (err) {
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 })
    }
    return NextResponse.json({ error: "Failed to sign upload" }, { status: 500 })
  }
}
