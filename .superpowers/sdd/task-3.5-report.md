# Task 3.5 Report — Gate upload/photos routes behind session

## What changed

### New file
- `tests/helpers/session-stub.ts` — `stubSession(user | null)` helper that calls `vi.doMock("@/lib/session", ...)`. The mock factory defines `MockedUnauthorizedError` inside the factory closure so the same class is both exported as `UnauthorizedError` AND thrown by `requireUser`. This ensures `instanceof UnauthorizedError` checks in routes hit the same class the mock exports — so the routes' catch blocks correctly identify and return 401.

### Modified routes
- `app/api/upload-url/route.ts` — removed `const userId = "anon"`. Added `requireUser()` call at top of `POST`; on `UnauthorizedError` returns 401 `{error:"Unauthorized"}`; stores resolved id as `userId`.
- `app/api/photos/route.ts` — removed `phase2UploaderId()` helper entirely. `POST` now calls `requireUser()` for `uploaderId`; `GET` also calls `requireUser()` (private signed URLs must be gated). Both return 401 on `UnauthorizedError`.

### Modified tests
- `tests/integration/upload-url.test.ts` — added `vi.resetModules()` + `stubSession({id:"u1"})` in `beforeEach`; converted both existing tests to dynamic `await import(...)` (must come after mock registration); updated key pattern from `/anon/` to `/u1/`; added 401 test.
- `tests/integration/photos.test.ts` — added `vi.resetModules()` + `seedUser()` + `stubSession({id:userId})` in `beforeEach`; converted existing tests to dynamic imports; added two 401 tests (POST and GET).

## How vi.doMock + dynamic import works

`vi.doMock` registers a module factory without hoisting (unlike `vi.mock` which is hoisted). The mock only takes effect for module resolutions that happen after `doMock` is called. Combined with `vi.resetModules()` in `beforeEach` (which clears Vitest's module registry), each test starts with a clean slate: `doMock` registers the desired mock, then `await import(...)` resolves the route module fresh — picking up the mock. Without `vi.resetModules()`, previously cached imports would bypass the new mock registration.

For the 401 tests: `vi.resetModules()` is called again inside the test itself (after `beforeEach` already seeded a valid session), then `stubSession(null)` registers a new null-user mock, then the route is dynamically imported.

## RED → GREEN for 401 tests

Before implementing the session guard, calling `POST` or `GET` without a session returned 200/201 (Phase 2 placeholder). After:
- `stubSession(null)` → `requireUser()` throws `MockedUnauthorizedError` → route catches `instanceof UnauthorizedError` (same mocked class) → returns 401.

All three 401 tests (upload-url × 1, photos POST × 1, photos GET × 1) confirmed GREEN.

## Test/build output

```
npm run test:int  → 2 test files, 7 tests passed (was 4)
npm test          → 8 test files, 20 tests passed (unchanged)
npm run build     → ✓ Compiled successfully, TypeScript passed, all routes compiled
```

## Files changed

- `app/api/upload-url/route.ts`
- `app/api/photos/route.ts`
- `tests/helpers/session-stub.ts` (new)
- `tests/integration/upload-url.test.ts`
- `tests/integration/photos.test.ts`
- `.superpowers/sdd/task-3.5-report.md` (this file)

## Concerns

None. The `vi.doMock` + `vi.resetModules()` + dynamic import pattern is stable and deterministic. The `instanceof` identity problem (two `UnauthorizedError` classes from different module instances) is fully solved by defining the mock class inside the factory closure.
