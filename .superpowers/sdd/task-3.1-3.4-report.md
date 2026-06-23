# Task 3.1–3.4 Implementation Report

## Status: COMPLETE

## Installed next-auth version
`next-auth@5.0.0-beta.31` — fully compatible with Next.js 16.2.9 (Turbopack). Build passed without errors.

## TDD RED/GREEN summary

### Task 3.1 — `lib/auth-allowlist.ts`
- **RED**: `tests/unit/auth-allowlist.test.ts` written first; import failed (module not found).
- **GREEN**: Implemented `isAllowlisted(email)` reading `ALLOWLIST_EMAILS`, case-insensitive, trims whitespace, rejects null/empty. 3/3 tests pass.

### Task 3.4 — `lib/session.ts`
- **RED**: `tests/unit/session.test.ts` written first; import failed (module not found).
- **GREEN**: Implemented `UnauthorizedError` + `requireUser()` calling `auth()`, throwing on no session. 2/2 tests pass. `@/lib/auth` fully mocked via `vi.mock`.

## Files changed

| File | Status |
|------|--------|
| `lib/auth-allowlist.ts` | Created (Task 3.1) |
| `tests/unit/auth-allowlist.test.ts` | Created (Task 3.1) |
| `lib/auth.ts` | Created (Task 3.2) |
| `types/next-auth.d.ts` | Created (Task 3.2) |
| `app/api/auth/[...nextauth]/route.ts` | Created (Task 3.3) |
| `lib/session.ts` | Created (Task 3.4) |
| `tests/unit/session.test.ts` | Created (Task 3.4) |
| `.env.example` | Created (auth keys) |
| `.env` | Updated (appended auth placeholders, not committed) |

## Convention compliance
- All paths are root-relative (no `src/`) per conventions §1.
- Prisma client imported as `prisma` from `@/lib/db` per conventions §2.
- `User.name` always supplied with fallback to `email.split("@")[0]` per conventions §3.
- `User.role` always explicitly passed on create per conventions §3.
- NO `import "server-only"` in `lib/auth.ts` or `lib/session.ts` per conventions §5.
- `@/*` alias resolves to `./*` per tsconfig.

## auth.ts key design decisions
- `providers`: Google with explicit `clientId`/`clientSecret` env vars.
- `session.strategy: "jwt"` (no adapter needed).
- `callbacks.signIn`: calls `isAllowlisted(profile?.email)` — non-allowlisted users rejected before any DB row is created.
- `callbacks.jwt`: on first sign-in (profile present), upserts user row. `update` uses `?? undefined` to avoid overwriting name with null (required field). `create` always supplies `name` (fallback to email local-part) and `role` (explicit, based on OWNER_EMAIL comparison).
- `callbacks.session`: exposes `session.user.id` and `session.user.role` from token.

## Test/build output

### Unit tests (npm test): 20/20 passed
- 3 tests: auth-allowlist (Task 3.1)
- 2 tests: session (Task 3.4)
- 15 tests: pre-existing (smoke, keys, validation, r2, exif, blurhash)

### Integration tests (npm run test:int): 4/4 passed
- 2 tests: upload-url
- 2 tests: photos

### Build (npm run build): PASSED
- TypeScript clean compile
- All 7 routes compiled (including `/api/auth/[...nextauth]`)
- No next-auth / Next 16 incompatibility

## Concerns / deferred
- **Google OAuth creds**: `GOOGLE_CLIENT_ID=dummy` / `GOOGLE_CLIENT_SECRET=dummy` in local `.env`. Live sign-in deferred to Task 3.8 per conventions §8.
- **R2 malformed env vars**: pre-existing issue (flagged in conventions §8). Does not affect auth tasks.
- **Node 20 deprecation warning** from AWS SDK: non-blocking, cosmetic only.

## Commits
1. `bdfd780` — `feat: email allowlist check (Task 3.1)`
2. `fd16362` — `feat: Auth.js v5 Google provider + allowlist signIn + auth route (Tasks 3.2-3.3)`
3. `b6334b1` — `feat: requireUser() session helper (Task 3.4)`
