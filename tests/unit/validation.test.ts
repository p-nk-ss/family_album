import { describe, it, expect } from "vitest"
import {
  assertUploadable,
  ValidationError,
  MAX_UPLOAD_BYTES,
  photoCaptionSchema,
} from "@/lib/validation"

describe("assertUploadable", () => {
  it("accepts a valid jpeg under the size cap", () => {
    expect(() => assertUploadable({ contentType: "image/jpeg", sizeBytes: 1000 })).not.toThrow()
  })

  it("rejects an unsupported content type", () => {
    expect(() => assertUploadable({ contentType: "application/pdf", sizeBytes: 1000 }))
      .toThrow(ValidationError)
  })

  it("rejects a file over the size cap", () => {
    expect(() => assertUploadable({ contentType: "image/png", sizeBytes: MAX_UPLOAD_BYTES + 1 }))
      .toThrow(ValidationError)
  })

  it("rejects zero-byte files", () => {
    expect(() => assertUploadable({ contentType: "image/png", sizeBytes: 0 }))
      .toThrow(ValidationError)
  })
})

describe("photoCaptionSchema", () => {
  it("keeps a trimmed caption", () => {
    const r = photoCaptionSchema.safeParse({ caption: "  Summer at the lake  " })
    expect(r.success).toBe(true)
    expect(r.success && r.data.caption).toBe("Summer at the lake")
  })

  it("normalizes an empty / whitespace caption to null", () => {
    expect(photoCaptionSchema.parse({ caption: "" }).caption).toBeNull()
    expect(photoCaptionSchema.parse({ caption: "   " }).caption).toBeNull()
  })

  it("accepts an explicit null", () => {
    expect(photoCaptionSchema.parse({ caption: null }).caption).toBeNull()
  })

  it("rejects a caption longer than 2000 chars", () => {
    const r = photoCaptionSchema.safeParse({ caption: "x".repeat(2001) })
    expect(r.success).toBe(false)
  })

  it("rejects a missing caption field", () => {
    expect(photoCaptionSchema.safeParse({}).success).toBe(false)
  })
})
