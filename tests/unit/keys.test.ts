import { describe, it, expect } from "vitest"
import { extensionFor, photoKey, thumbKeyFor } from "@/lib/keys"

describe("keys", () => {
  it("maps content types to extensions", () => {
    expect(extensionFor("image/jpeg")).toBe("jpg")
    expect(extensionFor("image/png")).toBe("png")
    expect(extensionFor("image/webp")).toBe("webp")
  })

  it("builds a namespaced photo key with a uuid and extension", () => {
    const key = photoKey("user-1", "image/jpeg", "abc")
    expect(key).toBe("photos/user-1/abc.jpg")
  })

  it("derives a thumb key from an original key", () => {
    expect(thumbKeyFor("photos/user-1/abc.jpg")).toBe("thumbs/user-1/abc.jpg")
  })
})
