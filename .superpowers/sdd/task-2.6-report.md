# Task 2.6 Report — Photos API + DTO + DB Helpers

## TDD Evidence

### RED Phase
- Wrote `tests/helpers/db.ts` and `tests/integration/photos.test.ts` first
- Running `npm run test:int -- photos` before `app/api/photos/route.ts` existed:
  ```
  FAIL  tests/integration/photos.test.ts
  Error: Cannot find package '@/app/api/photos/route'
  ```
- Confirmed: 1 failed suite, 0 tests executed

### GREEN Phase
- Implemented `lib/dto.ts` (NO `import "server-only"` per conventions)
- Implemented `app/api/photos/route.ts` with `phase2UploaderId()` upsert helper
- Running `npm run test:int -- photos` after implementation:
  ```
  Test Files  1 passed (1)
       Tests  2 passed (2)
  ```

## Files Changed

| File | Action |
|------|--------|
| `tests/helpers/db.ts` | Created — `resetDb()` + `seedUser()` using `prisma` (not `db`) |
| `lib/dto.ts` | Created — `PhotoListItem` interface + `signPhotoList()`, no `server-only` |
| `app/api/photos/route.ts` | Created — POST (create) + GET (list) with `phase2UploaderId()` upsert |
| `tests/integration/photos.test.ts` | Created — 2 integration tests against real Neon |

## Key Convention Adherences

- Import: `import { prisma } from "@/lib/db"` everywhere (never `db`, never `@prisma/client`)
- `User.name` and `User.role` always provided on create (both required, no defaults)
- No `import "server-only"` in `lib/dto.ts` (would break Vitest)
- `phase2UploaderId()` upserts `anon@local` placeholder — Phase 3 will replace with `requireUser()`
- Photo field names match actual schema: `r2Key`, `thumbKey`, `uploaderId`, `sizeBytes`, `contentType`, `takenAt`, `uploadedAt`, `blurhash`, `caption`, `width`, `height`

## Test Summaries

### Integration (`npm run test:int`)
```
Test Files  2 passed (2)   [photos + upload-url]
     Tests  4 passed (4)
```

### Unit (`npm test`)
```
Test Files  6 passed (6)
     Tests  15 passed (15)
```

### Build (`npm run build`)
```
✓ Compiled successfully
✓ TypeScript check passed
Route /api/photos — Dynamic (server-rendered)
```

## Concerns

- `lib/r2.ts` uses a module-level singleton `client` variable. Because Vitest re-uses module state across tests within the same run, the S3Client is shared with env vars set in `env-setup.ts` (fake R2 creds). This is intentional and working — presigned URLs are generated with fake but valid-format credentials.
- The `thumbKey` field in `photoMetadataSchema` accepts `null`, so when no thumb is present `presignGet` falls back to `r2Key`. This is correctly implemented in `signPhotoList`.
- Node 20 deprecation warnings from AWS SDK (requires Node >=22 after Jan 2027) — not a blocker for now.
