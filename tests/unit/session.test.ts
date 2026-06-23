import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }))
import { auth } from "@/lib/auth"
import { requireUser, UnauthorizedError } from "@/lib/session"

beforeEach(() => vi.resetAllMocks())

describe("requireUser", () => {
  it("returns the user when a session exists", async () => {
    ;(auth as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: { id: "u1", role: "member" },
    })
    await expect(requireUser()).resolves.toEqual({ id: "u1", role: "member" })
  })
  it("throws when there is no session", async () => {
    ;(auth as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(null)
    await expect(requireUser()).rejects.toThrow(UnauthorizedError)
  })
})
