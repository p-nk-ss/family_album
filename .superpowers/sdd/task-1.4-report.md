# Task 1.4 Report — POST /api/upload-url

## TDD Evidence

### RED Phase
Ran `npm run test:int -- upload-url` before creating the route. Result:
```
FAIL  tests/integration/upload-url.test.ts [ tests/integration/upload-url.test.ts ]
Error: Cannot find package '@/app/api/upload-url/route' imported from ...
Test Files  1 failed (1)
Tests  no tests
```
Failure reason: route module did not exist. Correct RED — not a logic error, not a typo.

### GREEN Phase
Implemented `app/api/upload-url/route.ts`. Ran `npm run test:int -- upload-url`:
```
Test Files  1 passed (1)
Tests  2 passed (2)
```

## Files Changed / Created

- `vitest.integration.config.ts` — new integration vitest config with tsconfigPaths, node env, `tests/integration/**/*.test.ts` glob, `tests/helpers/env-setup.ts` setup file
- `tests/helpers/env-setup.ts` — loads dotenv/config first (for future DB tests), then forces deterministic fake R2 env vars (plain `=` assignment, not `??=`)
- `tests/integration/upload-url.test.ts` — two integration tests: valid POST returns 200 with presigned URLs + matching key patterns; invalid content type returns 400
- `app/api/upload-url/route.ts` — the route handler: parse JSON (400 on bad JSON), validate with uploadUrlSchema (400 on failure), build originalKey + thumbKey, presign both, return JSON; catches ValidationError → 400, other errors → 500

## Test Summaries

| Suite | Result |
|-------|--------|
| `npm run test:int` | 1 file, 2 tests — PASS |
| `npm test` (unit) | 4 files, 11 tests — PASS |
| `npm run build` | Compiled + TypeScript clean; `/api/upload-url` appears as `ƒ (Dynamic)` |

## Concerns

1. **S3 client caching** — `lib/r2.ts` caches the S3Client in a module-level `let client`. Between test runs the cached client may have stale env. Tests pass because `env-setup.ts` sets vars before any import, but if test ordering changes this could surface. No action needed for Phase 1.
2. **Node.js version warning** — AWS SDK v3 warns that future versions will require Node ≥22; current is Node 20. Not blocking.
3. **Thumb presign with contentLength: 1** — thumb size is a placeholder `1` byte (thumb not yet generated on the client). Phase 1 spec doesn't define the real size; Phase 2 (client thumbnail + Uploader) will pass the actual size. Noted in route with a comment would be ideal but per minimal-implementation TDD rule left lean.
4. **Real R2 creds malformed** — covered by convention §8. Integration tests use forced fake creds; presigning is local crypto and succeeds.
