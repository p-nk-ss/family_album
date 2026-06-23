import { NextResponse } from "next/server"
import { uploadUrlSchema, ValidationError } from "@/lib/validation"
import { photoKey, thumbKeyFor } from "@/lib/keys"
import { presignPut } from "@/lib/r2"
import { requireUser, UnauthorizedError } from "@/lib/session"

export async function POST(request: Request) {
  let userId: string
  try {
    userId = (await requireUser()).id
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    throw e
  }

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
