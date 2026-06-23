# Task 5.1 + 5.3 + 5.6 — Logic/API Implementation Report

**Branch:** `build/family-albums`
**Date:** 2026-06-23

---

## Files created

| File | Task |
|------|------|
| `lib/on-this-day.ts` | 5.3 |
| `tests/unit/on-this-day.test.ts` | 5.3 |
| `lib/reconcile.ts` | 5.6 |
| `tests/unit/reconcile.test.ts` | 5.6 |
| `app/api/photos/[id]/comments/route.ts` | 5.1 |
| `tests/integration/comments.test.ts` | 5.1 |

---

## TDD evidence

### Task 5.3 — `lib/on-this-day.ts`

1. **RED**: `tests/unit/on-this-day.test.ts` written; `npm test -- on-this-day` failed with `Cannot find package '@/lib/on-this-day'`.
2. **GREEN**: `lib/on-this-day.ts` created; `npm test -- on-this-day` → 1 file, 6 tests passed.

`matchesToday` uses `getUTCMonth() + 1` and `getUTCDate()` for month/day comparison. `groupByYear` uses `getUTCFullYear()` to bucket a generic `T extends { takenAt: Date }` array into a `Map<number, T[]>`.

### Task 5.6 — `lib/reconcile.ts`

1. **RED**: `tests/unit/reconcile.test.ts` written; `npm test -- reconcile` failed with `Cannot find package '@/lib/reconcile'`.
2. **GREEN**: `lib/reconcile.ts` created; `npm test -- reconcile` → 1 file, 3 tests passed.

`isOrphan` returns `false` immediately if `knownKeys.has(key)` (key has a DB row). Otherwise computes age in ms and returns `true` iff `ageMs >= minAgeHours * 3_600_000` (default 6 h).

### Task 5.1 — `app/api/photos/[id]/comments/route.ts`

1. **RED**: `tests/integration/comments.test.ts` written; `npm run test:int -- comments` failed with `Cannot find package` for the route (4/4 tests failed).
2. **GREEN**: route created; `npm run test:int -- comments` → 1 file, 4 tests passed.

Route conventions followed exactly:
- `import { prisma } from "@/lib/db"` (NOT `db`).
- No `import "server-only"`.
- `{ params }: { params: Promise<{ id: string }> }` + `await params`.
- Both GET and POST gate behind `requireUser()`, catching `UnauthorizedError` → 401.
- POST validates with zod `z.string().min(1).max(2000)`, 400 on failure.
- POST returns `201 { id }`, GET returns `{ comments: [{ id, body, authorName, createdAt: ISO }] }`.

Integration test pattern follows `tests/integration/photos.test.ts`:
- `vi.resetModules()` in `beforeEach`.
- `stubSession(...)` before `await import(...)`.
- `seedUser()` for DB seed; Photo created with `uploaderId: userId`, `r2Key`, `contentType`.
- `ctx()` returns `{ params: Promise.resolve({ id: photoId }) }`.

---

## Test results

```
Unit (npm test):
  Test Files  11 passed (11)
       Tests  34 passed (34)

Integration (npm run test:int):
  Test Files   5 passed (5)
       Tests  25 passed (25)

Build (npm run build): SUCCESS
  Route ƒ /api/photos/[id]/comments built and listed.
```

---

## Commits

1. `feat: on-this-day date helpers and orphan-reconciliation predicate (Tasks 5.3, 5.6)`
2. `feat: photo comments API GET+POST with auth gate (Task 5.1)`

---

## Concerns / notes

- **GET is auth-gated**: the task prompt says "gate it with `requireUser()` for consistency with photos API". Done. If the product later wants public comment reads, this is a one-line change.
- **SSL warning** (`prefer` treated as `verify-full`) is a pg-connection-string library warning, not a Prisma or app issue. It doesn't affect tests or correctness.
- **Node version warning** from AWS SDK (requires node ≥22 after Jan 2027). Non-blocking for now.
- **On-this-day PAGE** (Task 5.3 step 5) is deferred as instructed — lib only implemented here.
- **Reconcile cron ROUTE** (Task 5.6 step 5) is deferred as instructed — predicate only implemented here.
