import { describe, it, expect } from "vitest"
import { isOrphan } from "@/lib/reconcile"

const now = new Date("2026-06-21T12:00:00Z")

describe("isOrphan", () => {
  it("flags an old key with no DB row", () => {
    expect(isOrphan("photos/u/x.jpg", new Set(), new Date("2026-06-21T06:00:00Z"), now)).toBe(true)
  })
  it("spares a key that has a DB row", () => {
    expect(isOrphan("photos/u/x.jpg", new Set(["photos/u/x.jpg"]), new Date("2026-06-21T06:00:00Z"), now)).toBe(false)
  })
  it("spares a recent key (grace period)", () => {
    expect(isOrphan("photos/u/x.jpg", new Set(), new Date("2026-06-21T11:30:00Z"), now)).toBe(false)
  })
})
