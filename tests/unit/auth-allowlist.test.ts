import { describe, it, expect, beforeEach } from "vitest"
import { isAllowlisted } from "@/lib/auth-allowlist"

beforeEach(() => {
  process.env.ALLOWLIST_EMAILS = "Mom@Example.com, dad@example.com ,sis@example.com"
})

describe("isAllowlisted", () => {
  it("matches case-insensitively and trims whitespace", () => {
    expect(isAllowlisted("mom@example.com")).toBe(true)
    expect(isAllowlisted("  DAD@example.com ")).toBe(true)
  })
  it("rejects non-listed emails", () => {
    expect(isAllowlisted("stranger@example.com")).toBe(false)
  })
  it("rejects null/empty", () => {
    expect(isAllowlisted(null)).toBe(false)
    expect(isAllowlisted("")).toBe(false)
  })
})
