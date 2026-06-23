# Security Fix Report — Album GET Auth Guards

## Status: COMPLETE

Critical finding from final code review: two GET handlers were left open (no `requireUser()` guard), leaking album metadata + presigned cover thumb URLs and full album+photo rows to unauthenticated requests.

---

## Routes Fixed

| Route | File | Change |
|-------|------|--------|
| `GET /api/albums` | `app/api/albums/route.ts` | Added `requireUser()` guard at top of `GET()`, matching the pattern in `app/api/photos/route.ts` |
| `GET /api/albums/[id]` | `app/api/albums/[id]/route.ts` | Added `requireUser()` guard at top of `GET()`, before `params` await and `prisma.album.findUnique` |

Both guards use the same try/catch pattern as all other guarded handlers in the codebase:
```ts
try {
  await requireUser()
} catch (e) {
  if (e instanceof UnauthorizedError)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  throw e
}
```

PATCH and DELETE handlers in `app/api/albums/[id]/route.ts` were already guarded — left untouched.

---

## New Tests Added (`tests/integration/albums.test.ts`)

Two tests added using the established `vi.resetModules()` + `stubSession(null)` + dynamic import pattern:

- `"returns 401 for GET /api/albums without session"` — calls `GET()` with no session stub → asserts `res.status === 401`
- `"returns 401 for GET /api/albums/[id] without session"` — calls `GET(req, {params})` with no session stub → asserts `res.status === 401`

### RED/GREEN evidence

Before the guard was added, `GET()` in `app/api/albums/route.ts` had no `requireUser()` call — `stubSession(null)` had no effect and the handler would proceed to the DB query, returning 200. Likewise for the `[id]` GET. The guard is the sole mechanism that makes these tests return 401. The tests are written to fail if the guard is removed (they assert 401; without the guard they get 200).

---

## Test & Build Output

### Integration (`npm run test:int`)
```
Test Files  5 passed (5)
Tests  27 passed (27)   [+2 new 401 tests from 25 baseline]
```

### Unit (`npm test`)
```
Test Files  11 passed (11)
Tests  34 passed (34)   [unchanged]
```

### Build (`npm run build`)
```
✓ Compiled successfully in 2.6s
Running TypeScript ... Finished TypeScript in 2.8s
✓ Generating static pages (11/11)
All routes present including /api/albums and /api/albums/[id] as ƒ (Dynamic)
```

---

## Concerns

None. All mutating routes were already guarded. This fix closes the only remaining auth gaps identified in the final review. No regressions.
