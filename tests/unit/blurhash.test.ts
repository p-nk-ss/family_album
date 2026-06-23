import { describe, it, expect } from "vitest"
import { encodeBlurhash, isValidBlurhash } from "@/lib/blurhash"

describe("blurhash", () => {
  it("encodes a flat-color image to a valid hash", () => {
    const w = 8, h = 8
    const pixels = new Uint8ClampedArray(w * h * 4)
    for (let i = 0; i < pixels.length; i += 4) {
      pixels[i] = 192; pixels[i + 1] = 106; pixels[i + 2] = 75; pixels[i + 3] = 255
    }
    const hash = encodeBlurhash(pixels, w, h)
    expect(typeof hash).toBe("string")
    expect(isValidBlurhash(hash)).toBe(true)
  })

  it("rejects an invalid hash", () => {
    expect(isValidBlurhash("")).toBe(false)
    expect(isValidBlurhash("!!!")).toBe(false)
  })
})
