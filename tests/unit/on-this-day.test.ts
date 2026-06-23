import { describe, it, expect } from "vitest"
import { matchesToday, groupByYear } from "@/lib/on-this-day"

describe("matchesToday", () => {
  it("matches same month/day across years", () => {
    expect(matchesToday(new Date("2019-06-21T10:00:00Z"), { month: 6, day: 21 })).toBe(true)
  })
  it("ignores different days", () => {
    expect(matchesToday(new Date("2019-06-20T10:00:00Z"), { month: 6, day: 21 })).toBe(false)
  })
  it("ignores different months", () => {
    expect(matchesToday(new Date("2019-07-21T10:00:00Z"), { month: 6, day: 21 })).toBe(false)
  })
  it("works for year-boundary dates (Dec 31)", () => {
    expect(matchesToday(new Date("2022-12-31T00:00:00Z"), { month: 12, day: 31 })).toBe(true)
  })
})

describe("groupByYear", () => {
  it("groups photos by UTC year", () => {
    const photos = [
      { takenAt: new Date("2020-06-01T00:00:00Z") },
      { takenAt: new Date("2020-08-15T00:00:00Z") },
      { takenAt: new Date("2021-06-01T00:00:00Z") },
    ]
    const map = groupByYear(photos)
    expect(map.size).toBe(2)
    expect(map.get(2020)?.length).toBe(2)
    expect(map.get(2021)?.length).toBe(1)
  })

  it("returns an empty map for empty input", () => {
    expect(groupByYear([]).size).toBe(0)
  })
})
