import { describe, it, expect } from "vitest"
import { env } from "@/lib/env"

describe("env", () => {
  it("returns the fallback when the variable is unset", () => {
    expect(env("DEFINITELY_UNSET_VAR", "fallback")).toBe("fallback")
  })
})
