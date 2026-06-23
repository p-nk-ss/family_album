import { describe, it, expect } from "vitest"
import { positionsFor, applyReorder } from "@/lib/reorder"

describe("reorder", () => {
  it("assigns 0-based positions in order", () => {
    expect(positionsFor(["b", "a", "c"])).toEqual([
      { photoId: "b", position: 0 },
      { photoId: "a", position: 1 },
      { photoId: "c", position: 2 },
    ])
  })

  it("reorders an existing set", () => {
    const current = [
      { photoId: "a", position: 0 },
      { photoId: "b", position: 1 },
    ]
    expect(applyReorder(current, ["b", "a"])).toEqual([
      { photoId: "b", position: 0 },
      { photoId: "a", position: 1 },
    ])
  })

  it("throws if the new order is not a permutation of current ids", () => {
    const current = [{ photoId: "a", position: 0 }]
    expect(() => applyReorder(current, ["a", "x"])).toThrow()
  })

  it("throws if new order has duplicates", () => {
    const current = [
      { photoId: "a", position: 0 },
      { photoId: "b", position: 1 },
    ]
    expect(() => applyReorder(current, ["a", "a"])).toThrow()
  })

  it("throws if new order is missing an id", () => {
    const current = [
      { photoId: "a", position: 0 },
      { photoId: "b", position: 1 },
    ]
    expect(() => applyReorder(current, ["a"])).toThrow()
  })
})
