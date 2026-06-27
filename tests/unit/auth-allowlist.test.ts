import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { isAllowlisted } from "@/lib/auth-allowlist"

const ORIGINAL_OWNER = process.env.OWNER_EMAIL

beforeEach(() => {
  process.env.ALLOWLIST_EMAILS = "Mom@Example.com, dad@example.com ,sis@example.com"
  process.env.OWNER_EMAIL = "Owner@Example.com"
})

afterEach(() => {
  process.env.OWNER_EMAIL = ORIGINAL_OWNER
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

  it("always allows the owner (normalized), even with an empty ALLOWLIST_EMAILS", () => {
    process.env.ALLOWLIST_EMAILS = ""
    expect(isAllowlisted("owner@example.com")).toBe(true)
    expect(isAllowlisted("  OWNER@Example.com ")).toBe(true)
  })

  it("always allows the owner even when ALLOWLIST_EMAILS is absent", () => {
    delete process.env.ALLOWLIST_EMAILS
    expect(isAllowlisted("owner@example.com")).toBe(true)
  })

  it("still rejects a stranger when ALLOWLIST_EMAILS is empty", () => {
    process.env.ALLOWLIST_EMAILS = ""
    expect(isAllowlisted("stranger@example.com")).toBe(false)
  })
})
