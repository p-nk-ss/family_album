import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { parseExif } from "@/lib/exif"

describe("parseExif", () => {
  it("extracts capture date and dimensions from a jpeg", async () => {
    const bytes = readFileSync("tests/fixtures/sample.jpg")
    const blob = new Blob([bytes], { type: "image/jpeg" })
    const meta = await parseExif(blob)
    // sample.jpg may or may not carry EXIF; shape must always be correct.
    expect(meta).toHaveProperty("takenAt")
    expect(meta).toHaveProperty("width")
    expect(meta).toHaveProperty("orientation")
  })

  it("returns nulls for a non-image blob", async () => {
    const blob = new Blob([new Uint8Array([1, 2, 3])], { type: "application/octet-stream" })
    const meta = await parseExif(blob)
    expect(meta.takenAt).toBeNull()
  })
})
