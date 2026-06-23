# Task 3.6 Report — Sign-in Page, SessionProvider, Auth Middleware

## Split Config Rationale

`lib/auth.ts` includes a `jwt` callback that imports `prisma` (via `@prisma/adapter-pg`), which
is a Node.js-only module. Next.js middleware runs on the **Edge runtime** and cannot import
Node-only modules. The solution is a **split config**:

- `auth.config.ts` (root) — edge-safe: providers, `signIn` allowlist, `session` callback only.
  Imports only `next-auth/providers/google` and `@/lib/auth-allowlist` (pure env reads, no I/O).
- `lib/auth.ts` — spreads `authConfig` and **adds** the DB `jwt` callback (Prisma upsert).
- `middleware.ts` — imports only `auth.config.ts` → `NextAuth(authConfig)`. No Prisma.

## Files Changed

| File | Action |
|------|--------|
| `auth.config.ts` | **Created** — edge-safe NextAuthConfig (providers + signIn + session callbacks) |
| `lib/auth.ts` | **Refactored** — now spreads `authConfig`, adds DB `jwt` callback unchanged |
| `middleware.ts` | **Created** — edge middleware using only `authConfig`, protects 5 route groups |
| `app/providers.tsx` | **Created** — `"use client"` `<SessionProvider>` wrapper |
| `app/layout.tsx` | **Edited** — wraps `{children}` in `<Providers>` |
| `app/(auth)/signin/page.tsx` | **Created** — branded sign-in page with Google button |
| `tests/e2e/auth-gate.spec.ts` | **Created** — verifies redirect + button visibility |

## Build Output

```
▲ Next.js 16.2.9 (Turbopack)
✓ Compiled successfully in 3.2s
✓ TypeScript clean

Route (app)
├ ○ /signin
└ ○ /upload
ƒ Proxy (Middleware)
```

Note: Next 16 shows `⚠ The "middleware" file convention is deprecated. Please use "proxy" instead.`
This is a deprecation warning only — the middleware compiles and runs correctly. The build succeeds.

## Test Summary

- `npm test` (unit): **20/20 passed**
- `npm run test:int` (integration): **7/7 passed**
- `npm run test:e2e` (Playwright):
  - `landing.spec.ts` — ✓ passed (525ms)
  - `auth-gate.spec.ts` — ✓ passed (816ms): unauthenticated GET /upload → redirected to `/signin`, "Sign in with Google" button visible
  - `gallery.spec.ts` — skipped (pending R2 creds, pre-existing)

## E2e Redirect Proof

```
✓  [chromium] › tests/e2e/auth-gate.spec.ts:3:5 › unauthenticated /upload redirects to /signin
                and shows sign-in button (816ms)
```

The Playwright test navigated to `/upload` unauthenticated. The middleware redirected to `/signin`
(URL matched `/\/signin/`), and the "Sign in with Google" button was visible — without triggering
any real OAuth flow (middleware short-circuits before any auth provider is contacted).

## Concerns / Notes

1. **Next 16 middleware deprecation**: Next 16 renamed `middleware.ts` → `proxy.ts`. The warning
   is cosmetic for now; the existing `middleware.ts` convention still works. If a future Next 16.x
   patch drops it entirely, rename `middleware.ts` → `proxy.ts` (no code changes needed).

2. **"Couldn't load fs/zlib"** in build output: these are expected edge/browser-bundle warnings
   from next-auth internals when statically generating pages. They do not affect runtime.

3. **JWT type augmentation**: `token.userId` still typed as `{}` due to unresolved next-auth 5
   beta type augmentation — kept `as string` runtime guard (pre-existing minor, tracked in 3.1-3.4 review).

4. **Google OAuth not live**: `GOOGLE_CLIENT_ID=dummy` / `GOOGLE_CLIENT_SECRET=dummy` in `.env`.
   The sign-in page renders and the button is clickable, but a real OAuth round-trip will fail
   until real credentials are provisioned (deferred to Task 3.8).
