import { describe, it, expect } from "vitest"
import { assertUploadable, ValidationError, MAX_UPLOAD_BYTES } from "@/lib/validation"

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
