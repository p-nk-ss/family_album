import { vi } from "vitest"

export function stubSession(user: { id: string; role?: "admin" | "member" } | null) {
  // The MockedUnauthorizedError must be defined inside the factory so it's the
  // same class object that both the mock's requireUser throws AND the mock's
  // UnauthorizedError export references. This ensures the route's
  //   `if (e instanceof UnauthorizedError)`
  // check matches, because the route imports UnauthorizedError from the MOCKED
  // module — the same class that requireUser throws.
  vi.doMock("@/lib/session", () => {
    class MockedUnauthorizedError extends Error {}
    return {
      UnauthorizedError: MockedUnauthorizedError,
      requireUser: vi.fn(async () => {
        if (!user) throw new MockedUnauthorizedError("Not signed in")
        return { id: user.id, role: user.role ?? "member" }
      }),
    }
  })
}
