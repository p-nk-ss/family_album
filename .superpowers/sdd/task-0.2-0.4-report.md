# Task 0.2–0.4 Implementation Report

**Date:** 2026-06-22
**Branch:** `build/family-albums`
**Agent:** claude-sonnet-4-6

---

## Summary of Work

Implemented Phase 0 tasks 0.2, 0.3, 0.4, and CI workflow (0.5 file-only) for the Family Albums Next.js app.

---

## A. Task 0.2 — Vitest + env helper

### Packages installed
- `vitest`, `@vitejs/plugin-react`, `vite-tsconfig-paths` (devDependencies)

### Files created
- `vitest.config.ts` — tsconfigPaths plugin, `environment: "node"`, `include: ["tests/unit/**/*.test.ts"]`
- `tests/unit/smoke.test.ts` — imports `@/lib/env`, tests fallback
- `lib/env.ts` — the `env(key, fallback?)` helper at repo root (NOT `src/lib/`)

### TDD Red → Green evidence

**RED (before `lib/env.ts` existed):**
```
FAIL  tests/unit/smoke.test.ts
Error: Cannot find package '@/lib/env' imported from .../smoke.test.ts

 Test Files  1 failed (1)
      Tests  no tests
   Start at  22:04:50
   Duration  143ms
```

**GREEN (after `lib/env.ts`):**
```
 Test Files  1 passed (1)
      Tests  1 passed (1)
   Start at  22:04:59
   Duration  140ms
```

---

## B. Task 0.3 — Playwright + landing e2e

### Packages installed
- `@playwright/test` (devDependency)
- Chromium browser downloaded via `npx playwright install chromium`

### Files created
- `playwright.config.ts` — testDir `./tests/e2e`, webServer `npm run dev` on :3000, `reuseExistingServer: true`, honors `E2E_BASE_URL`
- `tests/e2e/landing.spec.ts` — GET / returns 200, heading `/family albums/i` is visible

---

## C. Task 0.4 — Palette + fonts + landing page (Tailwind v4)

### Conventions applied
- No `tailwind.config.ts` created (Tailwind v4 CSS-first approach)
- All paths at repo root (`app/`, `lib/`) — no `src/`
- `@theme` block in `app/globals.css` defines palette tokens

### Files modified/created

**`app/globals.css`:**
- Kept `@import "tailwindcss";`
- Added `@theme` block with:
  - `--color-paper: #F7F1E6`
  - `--color-paper-200: #EFE6D4`
  - `--color-ink: #2B2723`
  - `--color-terracotta: #C06A4B`
  - `--font-serif: var(--font-fraunces), Georgia, serif`
  - `--font-sans: var(--font-inter), system-ui, sans-serif`
- Body base styles: warm paper bg, ink text, subtle radial noise grain

**`app/layout.tsx`:**
- Loads `Fraunces` with `variable: "--font-fraunces"` and `Inter` with `variable: "--font-inter"` via `next/font/google`
- Both variables on `<html className>`
- `<body className="font-sans antialiased">`
- metadata: `title: "Family Albums"`

**`app/page.tsx`:**
- Eyebrow text `<p>est. at home</p>` (terracotta)
- `<h1 className="font-serif ...">Family Albums</h1>` — accessible heading for e2e
- Subtitle paragraph
- `<Link href="/library">Enter the library</Link>` styled `bg-terracotta text-paper`

---

## D. Task 0.5 (file only) — CI Workflow

**`.github/workflows/ci.yml`** created:
- Trigger: push + pull_request
- ubuntu-latest, Node 20, npm cache
- Steps: `npm ci` → `npm test` → `npx playwright install --with-deps chromium` → `npm run test:e2e`
- Vercel deploy step deferred (per conventions §8)

---

## Test + Build Output

### `npm test` (unit)
```
 Test Files  1 passed (1)
      Tests  1 passed (1)
   Start at  22:06:25
   Duration  143ms
```

### `npm run test:e2e`
```
Running 1 test using 1 worker
  ✓  1 [chromium] › tests/e2e/landing.spec.ts:3:5 › landing page renders the family mark (312ms)
  1 passed (7.0s)
```

### `npm run build`
```
✔ Generated Prisma Client (7.8.0) to ./generated/prisma in 63ms
▲ Next.js 16.2.9 (Turbopack)
✓ Compiled successfully in 1449ms
✓ TypeScript passed
✓ Generating static pages (4/4) in 285ms

Route (app)
┌ ○ /
└ ○ /_not-found
```

---

## Files Changed

| File | Action |
|------|--------|
| `vitest.config.ts` | Created |
| `tests/unit/smoke.test.ts` | Created |
| `lib/env.ts` | Created |
| `playwright.config.ts` | Created |
| `tests/e2e/landing.spec.ts` | Created |
| `app/globals.css` | Modified — replaced with @theme palette + base styles |
| `app/layout.tsx` | Modified — Fraunces+Inter fonts, Family Albums title |
| `app/page.tsx` | Modified — new landing page with h1 "Family Albums" |
| `.github/workflows/ci.yml` | Created |
| `package.json` | Modified — added vitest, playwright devDeps |
| `package-lock.json` | Modified — lockfile updated |

---

## Git hygiene
- `.env` confirmed untracked (not committed)
- `generated/` confirmed untracked (gitignored)

---

## Concerns

1. **`vite-tsconfig-paths` deprecation notice:** Vitest emits a warning that `vite-tsconfig-paths` is redundant because Vite now supports `resolve.tsconfigPaths` natively. This is cosmetic — tests pass. Can be cleaned up in a follow-up by switching to `resolve: { tsconfigPaths: true }` in vitest.config.ts.

2. **`next/font/google` network dependency:** Font loading via `next/font/google` requires network access at build time to fetch font metadata. Build succeeded in this environment. If the build environment lacks network access (e.g., restricted CI), fonts will fall back to Georgia/system-ui which are declared as fallbacks in the `@theme` block. The e2e heading test does not depend on the specific font rendering.
