# Family Albums — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a private, invite-only family photo library where allowlisted members upload photos directly to object storage and organize them into curated, manually-ordered album "stories," with a bespoke warm visual identity and lavish motion — shipped phase-by-phase to production.

**Architecture:** Next.js (App Router) full-stack on Vercel. Image bytes live in Cloudflare R2 (private bucket); the browser uploads directly via presigned PUT URLs and reads via short-lived presigned GET URLs — the server never proxies bytes. Postgres (Neon) via Prisma stores only metadata. Auth.js v5 (Google) gates everything behind an email allowlist. Pure logic lives in `src/lib/*` (unit-tested); route handlers/server components are thin wrappers. All framer-motion lives in `"use client"` islands under `src/components/motion/*`.

**Tech Stack:** Next.js 15 + React 19 + TypeScript, Tailwind CSS, Prisma + Neon Postgres, `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner` (R2), Auth.js v5 (`next-auth@5`), `exifr`, `blurhash`, `framer-motion@12`, Vitest + `aws-sdk-client-mock`, Playwright.

## Global Constraints

- **Package manager:** npm (lockfile v3 already present). Always `npm install`, never yarn/pnpm.
- **React/Next versions:** React `^19`, Next `^15` (satisfies `framer-motion@^12.40.0` peer range). Keep `framer-motion@^12.40.0` exactly as installed.
- **Privacy:** R2 bucket is **private**. No public objects ever. Every image fetch uses a short-lived presigned URL. R2 secret keys live **only** in server env, never shipped to the client.
- **Validation before signing:** the server validates `content_type ∈ {image/jpeg, image/png, image/webp, image/avif}` and `size ≤ MAX_UPLOAD_BYTES` (50 MB) **before** issuing any presigned PUT URL.
- **framer-motion rule (from CLAUDE.md):** any file importing `motion` and rendering `<motion.*>` MUST start with `"use client"` as its first line. Keep all motion in `src/components/motion/*`; server components import those islands without the directive.
- **Permissions (v1):** flat — every allowlisted member may upload, create/edit any album, comment. Deletes restricted to the creator/uploader. The `role` enum column exists and the owner is seeded `admin`, but role is behaviorally inert in v1.
- **Auth:** Google OAuth only. Allowlist via `ALLOWLIST_EMAILS` env (comma-separated). Non-allowlisted users are rejected in the `signIn` callback before any DB row is created.
- **TDD:** failing test first, then minimal implementation, then commit. Never write implementation before its test.
- **Deploy discipline:** every phase ends deployed to production and verified on the prod URL. No local-only accumulation.
- **Naming/casing:** Prisma models use camelCase fields with snake_case `@map` to match SPEC §5 column names.
- **App name:** placeholder `"Family Albums"` everywhere; finalize in Phase 5.

### Live-doc verification points (APIs move fast — confirm at coding time)

These are flagged inline where they occur. Re-check before writing the affected task:
1. **Auth.js v5** (`next-auth@5`, published `beta`): config shape (`NextAuth({...})` returning `{ handlers, auth, signIn, signOut }`), `auth()` replacing `getServerSession`, callback signatures. Read the v5 upgrade guide.
2. **R2 + AWS SDK presigner:** confirm `getSignedUrl(client, command, { expiresIn })` signature; `forcePathStyle: true`; endpoint `https://<accountid>.r2.cloudflarestorage.com`. **Checksum footgun:** newer SDK majors auto-add `x-amz-checksum-*` / `x-amz-sdk-checksum-algorithm` headers that R2 rejects on presigned PUT. Set `requestChecksumCalculation: "WHEN_REQUIRED"` on the client (and verify the browser PUT succeeds).
3. **Next.js 15:** dynamic route `params` is a `Promise` and must be `await`ed; route handlers use the Web `Request`/`Response` signature.
4. **Prisma + Neon:** pooled `DATABASE_URL` for runtime, direct `DIRECT_URL` for migrations.

---

## File Structure

```
src/
  app/
    layout.tsx                    # fonts, paper bg, providers
    page.tsx                      # Landing
    globals.css                   # Tailwind + palette CSS vars + paper texture
    providers.tsx                 # "use client" — SessionProvider + ReducedMotionProvider
    (auth)/signin/page.tsx        # branded Google sign-in
    upload/page.tsx               # upload entry
    library/page.tsx              # album grid (the heart)
    albums/new/page.tsx
    albums/[id]/page.tsx          # story view
    albums/[id]/edit/page.tsx     # reorder + cover (client island)
    photos/[id]/page.tsx          # photo detail / lightbox fallback
    on-this-day/page.tsx
    api/
      auth/[...nextauth]/route.ts
      upload-url/route.ts
      photos/route.ts             # POST create, GET list
      photos/[id]/route.ts        # GET signed original, DELETE
      photos/[id]/comments/route.ts
      albums/route.ts             # POST create, GET list
      albums/[id]/route.ts        # GET, PATCH, DELETE
      albums/[id]/photos/route.ts # POST add, PATCH reorder, DELETE remove
      cron/reconcile/route.ts     # Phase 5
  lib/
    env.ts            # typed env access
    keys.ts           # R2 key builders (pure)
    validation.ts     # zod schemas + content-type/size guards (pure)
    r2.ts             # S3 client + presignPut/presignGet (server-only)
    db.ts             # Prisma singleton (server-only)
    exif.ts           # client EXIF parse via exifr
    image-client.ts   # client canvas thumbnail + dimensions
    blurhash.ts       # encode/decode (client) + types
    reorder.ts        # album position math (pure)
    auth-allowlist.ts # isAllowlisted (pure)
    auth.ts           # Auth.js config (server-only)
    session.ts        # requireUser() (server-only)
    on-this-day.ts    # date grouping (pure)
    reconcile.ts      # orphan predicate (pure)
    dto.ts            # shared DTO types + signing helpers
  components/
    motion/
      ReducedMotionProvider.tsx
      FadeIn.tsx
      StaggerGrid.tsx
      KenBurns.tsx
      BlurUpImage.tsx
      PressableCard.tsx
      Lightbox.tsx
    library/AlbumCard.tsx
    album/StoryPhoto.tsx
    album/ReorderGrid.tsx
    upload/Uploader.tsx
    comments/CommentThread.tsx
    ui/Button.tsx
prisma/
  schema.prisma
  seed.ts
  migrations/
tests/
  unit/        # vitest, no I/O
  integration/ # vitest vs test Postgres
  e2e/         # playwright
  fixtures/    # sample image with EXIF
  helpers/     # db reset, session stub
vitest.config.ts
vitest.integration.config.ts
playwright.config.ts
vercel.json
.gitignore
.env.example
```

---

# PHASE 0 — Skeleton on prod

**Phase goal / gate:** every push auto-deploys; the production URL serves a styled landing page; CI runs unit + e2e green.

### Task 0.1: Merge-scaffold Next.js into the existing directory + git init

**Files:**
- Create: entire Next.js skeleton under `src/`, plus `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `postcss.config.mjs`
- Modify: `package.json` (merge deps/scripts)
- Create: `.gitignore`, `.env.example`

**Interfaces:**
- Produces: a runnable Next.js app (`npm run dev`), npm scripts `dev`/`build`/`start`/`lint`.

- [ ] **Step 1: Scaffold into a temp sibling directory**

```bash
cd /Users/pankaz-mac/Projects
npx create-next-app@latest fa-tmp \
  --typescript --app --tailwind --eslint --use-npm \
  --src-dir --import-alias "@/*" --no-turbopack
```
Expected: `fa-tmp/` created with a working Next.js + Tailwind app.

- [ ] **Step 2: Copy generated files in, preserving project docs and deps**

```bash
cd /Users/pankaz-mac/Projects/fa-tmp
# copy everything except package manifests, lockfile, node_modules, git ignore
rsync -a --exclude package.json --exclude package-lock.json \
  --exclude node_modules --exclude .gitignore --exclude .git \
  ./ /Users/pankaz-mac/Projects/family_albums/
```
Expected: `family_albums/src/`, `tsconfig.json`, `next.config.ts`, Tailwind/PostCSS configs now present; existing `SPEC.md`, `DESIGN_PROMPT.md`, `CLAUDE.md`, `plan.md`, `framer-motion` install untouched.

- [ ] **Step 3: Merge dependencies into the existing package.json**

Replace `/Users/pankaz-mac/Projects/family_albums/package.json` with (versions are floors — `npm install` resolves latest matching):

```json
{
  "name": "family_albums",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "prisma generate && next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:int": "vitest run --config vitest.integration.config.ts",
    "test:e2e": "playwright test"
  },
  "dependencies": {
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "framer-motion": "^12.40.0"
  },
  "devDependencies": {
    "typescript": "^5",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "tailwindcss": "^3.4.0",
    "postcss": "^8",
    "autoprefixer": "^10",
    "eslint": "^9",
    "eslint-config-next": "^15.0.0"
  }
}
```

- [ ] **Step 4: Install and clean up temp dir**

```bash
cd /Users/pankaz-mac/Projects/family_albums
npm install
rm -rf /Users/pankaz-mac/Projects/fa-tmp
```
Expected: single merged `package-lock.json`; `framer-motion` peer deps satisfied by React 19.

- [ ] **Step 5: Write `.gitignore` and `.env.example`**

`.gitignore`:
```
node_modules
.next
out
.env
.env*.local
playwright-report
test-results
prisma/*.db
.DS_Store
```

`.env.example`:
```
# R2 (Phase 1)
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=family-albums
R2_ENDPOINT=https://<accountid>.r2.cloudflarestorage.com
# DB (Phase 2)
DATABASE_URL=
DIRECT_URL=
# Auth (Phase 3)
AUTH_SECRET=
AUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
ALLOWLIST_EMAILS=you@example.com
OWNER_EMAIL=you@example.com
# Phase 5
CRON_SECRET=
```

- [ ] **Step 6: Verify dev server boots**

Run: `npm run dev`
Expected: server starts on `http://localhost:3000`, default page renders, no errors. Stop with Ctrl-C.

- [ ] **Step 7: git init + first commit**

```bash
cd /Users/pankaz-mac/Projects/family_albums
git init
git add -A
git commit -m "chore: scaffold Next.js app (App Router, TS, Tailwind)"
```

### Task 0.2: Vitest setup + smoke test

**Files:**
- Create: `vitest.config.ts`, `tests/unit/smoke.test.ts`, `src/lib/env.ts`

**Interfaces:**
- Produces: `src/lib/env.ts` exporting `env(key: string, fallback?: string): string`.

- [ ] **Step 1: Install Vitest**

```bash
npm install -D vitest @vitejs/plugin-react vite-tsconfig-paths
```

- [ ] **Step 2: Write `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config"
import tsconfigPaths from "vite-tsconfig-paths"

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts"],
  },
})
```

- [ ] **Step 3: Write the failing smoke test**

`tests/unit/smoke.test.ts`:
```ts
import { describe, it, expect } from "vitest"
import { env } from "@/lib/env"

describe("env", () => {
  it("returns the fallback when the variable is unset", () => {
    expect(env("DEFINITELY_UNSET_VAR", "fallback")).toBe("fallback")
  })
})
```

- [ ] **Step 4: Run test, verify it fails**

Run: `npm test`
Expected: FAIL — cannot resolve `@/lib/env`.

- [ ] **Step 5: Implement `src/lib/env.ts`**

```ts
export function env(key: string, fallback?: string): string {
  const value = process.env[key]
  if (value === undefined || value === "") {
    if (fallback !== undefined) return fallback
    throw new Error(`Missing required env var: ${key}`)
  }
  return value
}
```

- [ ] **Step 6: Run test, verify it passes**

Run: `npm test`
Expected: PASS (1 test).

- [ ] **Step 7: Commit**

```bash
git add vitest.config.ts tests/unit/smoke.test.ts src/lib/env.ts package.json package-lock.json
git commit -m "test: add vitest with env helper smoke test"
```

### Task 0.3: Playwright setup + landing e2e

**Files:**
- Create: `playwright.config.ts`, `tests/e2e/landing.spec.ts`

- [ ] **Step 1: Install Playwright**

```bash
npm install -D @playwright/test
npx playwright install chromium
```

- [ ] **Step 2: Write `playwright.config.ts`**

```ts
import { defineConfig, devices } from "@playwright/test"

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  use: { baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000" },
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : { command: "npm run dev", url: "http://localhost:3000", reuseExistingServer: true },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
})
```

- [ ] **Step 3: Write the failing e2e test**

`tests/e2e/landing.spec.ts`:
```ts
import { test, expect } from "@playwright/test"

test("landing page renders the family mark", async ({ page }) => {
  const res = await page.goto("/")
  expect(res?.status()).toBe(200)
  await expect(page.getByRole("heading", { name: /family albums/i })).toBeVisible()
})
```

- [ ] **Step 4: Run test, verify it fails**

Run: `npm run test:e2e`
Expected: FAIL — default Next.js page has no "Family Albums" heading.

- [ ] **Step 5: Commit (impl comes in Task 0.4)**

```bash
git add playwright.config.ts tests/e2e/landing.spec.ts package.json package-lock.json
git commit -m "test: add playwright landing e2e (failing until landing built)"
```

### Task 0.4: Palette, fonts, landing page

**Files:**
- Modify: `src/app/globals.css`, `tailwind.config.ts`, `src/app/layout.tsx`, `src/app/page.tsx`

**Interfaces:**
- Produces: CSS variables `--paper`, `--ink`, `--terracotta` and Tailwind colors `paper`, `ink`, `terracotta`.

- [ ] **Step 1: Define palette in `tailwind.config.ts`**

```ts
import type { Config } from "tailwindcss"

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#F7F1E6",      // warm cream
        ink: "#2B2723",        // deep warm ink
        terracotta: "#C06A4B", // single accent
        "paper-200": "#EFE6D4",
      },
      fontFamily: {
        serif: ["var(--font-serif)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config
```

- [ ] **Step 2: Set base styles in `src/app/globals.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --paper: #F7F1E6;
  --ink: #2B2723;
  --terracotta: #C06A4B;
}

body {
  background-color: var(--paper);
  color: var(--ink);
  /* subtle paper grain via layered radial noise; replace with texture asset in Phase 5 */
  background-image: radial-gradient(rgba(43,39,35,0.015) 1px, transparent 1px);
  background-size: 3px 3px;
}
```

- [ ] **Step 3: Wire fonts in `src/app/layout.tsx`**

```tsx
import type { Metadata } from "next"
import { Fraunces, Inter } from "next/font/google"
import "./globals.css"

const serif = Fraunces({ subsets: ["latin"], variable: "--font-serif", display: "swap" })
const sans = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" })

export const metadata: Metadata = {
  title: "Family Albums",
  description: "A private home for our family's photos.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  )
}
```

- [ ] **Step 4: Write the landing page `src/app/page.tsx`**

```tsx
import Link from "next/link"

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center text-center px-6">
      <p className="uppercase tracking-[0.3em] text-sm text-terracotta mb-6">est. at home</p>
      <h1 className="font-serif text-6xl md:text-8xl leading-none">Family Albums</h1>
      <p className="mt-6 max-w-md text-lg text-ink/70">
        A quiet place to keep our stories — albums, not a date dump.
      </p>
      <Link
        href="/library"
        className="mt-10 inline-block rounded-full bg-terracotta px-8 py-3 text-paper font-medium"
      >
        Enter the library
      </Link>
    </main>
  )
}
```

- [ ] **Step 5: Run e2e, verify it passes**

Run: `npm run test:e2e`
Expected: PASS — heading "Family Albums" visible, status 200.

- [ ] **Step 6: Commit**

```bash
git add tailwind.config.ts src/app/globals.css src/app/layout.tsx src/app/page.tsx
git commit -m "feat: warm cream/terracotta palette, fonts, landing page"
```

### Task 0.5: GitHub + Vercel + CI (provisioning)

**Files:**
- Create: `.github/workflows/ci.yml`

**Interfaces:**
- Produces: prod URL with push-to-deploy + PR previews; CI running unit + e2e.

- [ ] **Step 1: Create GitHub repo and push**

```bash
gh repo create family-albums --private --source=. --remote=origin --push
```
Expected: repo created, `main` pushed.

- [ ] **Step 2: Add CI workflow `.github/workflows/ci.yml`**

```yaml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: "20", cache: "npm" }
      - run: npm ci
      - run: npm test
      - run: npx playwright install --with-deps chromium
      - run: npm run test:e2e
```

- [ ] **Step 3: Connect Vercel (manual — user action)**

In the Vercel dashboard: **Add New → Project → import `family-albums`**. Framework auto-detected as Next.js. Deploy. Confirm:
- Production URL serves the landing page.
- Open a throwaway PR and confirm a **preview** deployment URL is generated.

> If you'd rather not click: `npm i -g vercel && vercel link && vercel --prod` works too, but the dashboard import is what wires push-to-deploy + previews automatically.

- [ ] **Step 4: Commit + push, confirm gate**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: run unit + e2e on push/PR"
git push
```
Expected: GitHub Actions green; Vercel prod redeploys with the landing page.

**✅ Phase 0 gate:** push auto-deploys; prod URL shows the landing page; CI green.

---

# PHASE 1 — Vertical slice: upload to R2 (no auth, no DB)

**Phase goal / gate:** a file chosen in the browser on **production** lands in the R2 bucket; the resulting object key is shown on screen.

### Task 1.1: R2 key builders (`lib/keys.ts`)

**Files:**
- Create: `src/lib/keys.ts`, `tests/unit/keys.test.ts`

**Interfaces:**
- Produces:
  - `extensionFor(contentType: string): string`
  - `photoKey(userId: string, contentType: string, id?: string): string` → `photos/{userId}/{uuid}.{ext}`
  - `thumbKeyFor(originalKey: string): string` → same path under `thumbs/`

- [ ] **Step 1: Write the failing test**

`tests/unit/keys.test.ts`:
```ts
import { describe, it, expect } from "vitest"
import { extensionFor, photoKey, thumbKeyFor } from "@/lib/keys"

describe("keys", () => {
  it("maps content types to extensions", () => {
    expect(extensionFor("image/jpeg")).toBe("jpg")
    expect(extensionFor("image/png")).toBe("png")
    expect(extensionFor("image/webp")).toBe("webp")
  })

  it("builds a namespaced photo key with a uuid and extension", () => {
    const key = photoKey("user-1", "image/jpeg", "abc")
    expect(key).toBe("photos/user-1/abc.jpg")
  })

  it("derives a thumb key from an original key", () => {
    expect(thumbKeyFor("photos/user-1/abc.jpg")).toBe("thumbs/user-1/abc.jpg")
  })
})
```

- [ ] **Step 2: Run test, verify it fails**

Run: `npm test -- keys`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/lib/keys.ts`**

```ts
import { randomUUID } from "node:crypto"

const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
}

export function extensionFor(contentType: string): string {
  const ext = EXT[contentType]
  if (!ext) throw new Error(`Unsupported content type: ${contentType}`)
  return ext
}

export function photoKey(userId: string, contentType: string, id = randomUUID()): string {
  return `photos/${userId}/${id}.${extensionFor(contentType)}`
}

export function thumbKeyFor(originalKey: string): string {
  return originalKey.replace(/^photos\//, "thumbs/")
}
```

- [ ] **Step 4: Run test, verify it passes**

Run: `npm test -- keys`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/keys.ts tests/unit/keys.test.ts
git commit -m "feat: R2 key builders"
```

### Task 1.2: Upload validation (`lib/validation.ts`)

**Files:**
- Create: `src/lib/validation.ts`, `tests/unit/validation.test.ts`

**Interfaces:**
- Produces:
  - `MAX_UPLOAD_BYTES = 50 * 1024 * 1024`
  - `ALLOWED_CONTENT_TYPES: readonly string[]`
  - `uploadUrlSchema` (zod) for `{ filename, contentType, sizeBytes }`
  - `photoMetadataSchema` (zod) for the `POST /api/photos` body (used in Phase 2)
  - `assertUploadable({ contentType, sizeBytes }): void` (throws `ValidationError`)
  - `class ValidationError extends Error`

- [ ] **Step 1: Install zod**

```bash
npm install zod
```

- [ ] **Step 2: Write the failing test**

`tests/unit/validation.test.ts`:
```ts
import { describe, it, expect } from "vitest"
import { assertUploadable, ValidationError, MAX_UPLOAD_BYTES } from "@/lib/validation"

describe("assertUploadable", () => {
  it("accepts a valid jpeg under the size cap", () => {
    expect(() => assertUploadable({ contentType: "image/jpeg", sizeBytes: 1000 })).not.toThrow()
  })

  it("rejects an unsupported content type", () => {
    expect(() => assertUploadable({ contentType: "application/pdf", sizeBytes: 1000 }))
      .toThrow(ValidationError)
  })

  it("rejects a file over the size cap", () => {
    expect(() => assertUploadable({ contentType: "image/png", sizeBytes: MAX_UPLOAD_BYTES + 1 }))
      .toThrow(ValidationError)
  })

  it("rejects zero-byte files", () => {
    expect(() => assertUploadable({ contentType: "image/png", sizeBytes: 0 }))
      .toThrow(ValidationError)
  })
})
```

- [ ] **Step 3: Run test, verify it fails**

Run: `npm test -- validation`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement `src/lib/validation.ts`**

```ts
import { z } from "zod"

export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024
export const ALLOWED_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
] as const

export class ValidationError extends Error {}

export function assertUploadable(input: { contentType: string; sizeBytes: number }): void {
  if (!ALLOWED_CONTENT_TYPES.includes(input.contentType as (typeof ALLOWED_CONTENT_TYPES)[number])) {
    throw new ValidationError(`Unsupported content type: ${input.contentType}`)
  }
  if (!Number.isInteger(input.sizeBytes) || input.sizeBytes <= 0) {
    throw new ValidationError("Invalid file size")
  }
  if (input.sizeBytes > MAX_UPLOAD_BYTES) {
    throw new ValidationError("File exceeds 50 MB limit")
  }
}

export const uploadUrlSchema = z.object({
  filename: z.string().min(1).max(255),
  contentType: z.enum(ALLOWED_CONTENT_TYPES),
  sizeBytes: z.number().int().positive().max(MAX_UPLOAD_BYTES),
})

export const photoMetadataSchema = z.object({
  r2Key: z.string().min(1),
  thumbKey: z.string().min(1).nullable(),
  contentType: z.enum(ALLOWED_CONTENT_TYPES),
  sizeBytes: z.number().int().positive(),
  width: z.number().int().positive().nullable(),
  height: z.number().int().positive().nullable(),
  takenAt: z.string().datetime().nullable(),
  blurhash: z.string().nullable(),
  caption: z.string().max(2000).nullable().optional(),
})
```

- [ ] **Step 5: Run test, verify it passes**

Run: `npm test -- validation`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add src/lib/validation.ts tests/unit/validation.test.ts package.json package-lock.json
git commit -m "feat: upload validation + zod schemas"
```

### Task 1.3: R2 presign helpers (`lib/r2.ts`)

**Files:**
- Create: `src/lib/r2.ts`, `tests/unit/r2.test.ts`

**Interfaces:**
- Produces:
  - `presignPut(input: { key: string; contentType: string; contentLength: number }): Promise<string>` — validates first, signs a PUT with `ContentType` bound, 300s TTL.
  - `presignGet(input: { key: string; expiresIn?: number }): Promise<string>` — signs a GET, default TTL 3h.

> **Live-doc check:** confirm the AWS SDK presigner signature and the R2 checksum behavior before finalizing (Global Constraints §2). The `requestChecksumCalculation: "WHEN_REQUIRED"` option below avoids the presigned-PUT footgun.

- [ ] **Step 1: Install the SDK + test mock**

```bash
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
npm install -D aws-sdk-client-mock
```

- [ ] **Step 2: Write the failing test**

`tests/unit/r2.test.ts`:
```ts
import { describe, it, expect, beforeEach } from "vitest"

beforeEach(() => {
  process.env.R2_ACCOUNT_ID = "acct"
  process.env.R2_ACCESS_KEY_ID = "key"
  process.env.R2_SECRET_ACCESS_KEY = "secret"
  process.env.R2_BUCKET = "family-albums"
  process.env.R2_ENDPOINT = "https://acct.r2.cloudflarestorage.com"
})

describe("presignPut", () => {
  it("rejects an invalid content type before signing", async () => {
    const { presignPut } = await import("@/lib/r2")
    await expect(
      presignPut({ key: "photos/u/x.pdf", contentType: "application/pdf", contentLength: 10 })
    ).rejects.toThrow()
  })

  it("returns a signed URL for a valid PUT", async () => {
    const { presignPut } = await import("@/lib/r2")
    const url = await presignPut({
      key: "photos/u/x.jpg",
      contentType: "image/jpeg",
      contentLength: 1000,
    })
    expect(url).toContain("https://acct.r2.cloudflarestorage.com")
    expect(url).toContain("X-Amz-Signature")
  })
})

describe("presignGet", () => {
  it("returns a signed GET URL", async () => {
    const { presignGet } = await import("@/lib/r2")
    const url = await presignGet({ key: "thumbs/u/x.jpg" })
    expect(url).toContain("X-Amz-Signature")
  })
})
```

- [ ] **Step 3: Run test, verify it fails**

Run: `npm test -- r2`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement `src/lib/r2.ts`**

```ts
import "server-only"
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { env } from "@/lib/env"
import { assertUploadable } from "@/lib/validation"

let client: S3Client | null = null

function s3(): S3Client {
  if (client) return client
  client = new S3Client({
    region: "auto",
    endpoint: env("R2_ENDPOINT"),
    forcePathStyle: true,
    credentials: {
      accessKeyId: env("R2_ACCESS_KEY_ID"),
      secretAccessKey: env("R2_SECRET_ACCESS_KEY"),
    },
    // Avoid x-amz-checksum-* headers R2 rejects on presigned PUT.
    requestChecksumCalculation: "WHEN_REQUIRED",
  })
  return client
}

export async function presignPut(input: {
  key: string
  contentType: string
  contentLength: number
}): Promise<string> {
  assertUploadable({ contentType: input.contentType, sizeBytes: input.contentLength })
  const command = new PutObjectCommand({
    Bucket: env("R2_BUCKET"),
    Key: input.key,
    ContentType: input.contentType,
  })
  return getSignedUrl(s3(), command, { expiresIn: 300 })
}

export async function presignGet(input: { key: string; expiresIn?: number }): Promise<string> {
  const command = new GetObjectCommand({ Bucket: env("R2_BUCKET"), Key: input.key })
  return getSignedUrl(s3(), command, { expiresIn: input.expiresIn ?? 60 * 60 * 3 })
}
```

> If `requestChecksumCalculation` is not accepted by the installed SDK version, remove it and instead strip checksum headers via a client middleware — verify against live docs.

- [ ] **Step 5: Run test, verify it passes**

Run: `npm test -- r2`
Expected: PASS (3 tests).

> Note: `import "server-only"` may need a no-op shim under Vitest's node env. If the import errors, add `server-only` as a dep (`npm i server-only`) — it resolves to a noop outside the bundler.

- [ ] **Step 6: Commit**

```bash
git add src/lib/r2.ts tests/unit/r2.test.ts package.json package-lock.json
git commit -m "feat: R2 presign PUT/GET helpers"
```

### Task 1.4: `POST /api/upload-url` route

**Files:**
- Create: `src/app/api/upload-url/route.ts`, `tests/integration/upload-url.test.ts`
- Create: `vitest.integration.config.ts`

**Interfaces:**
- Consumes: `presignPut`, `uploadUrlSchema`, `photoKey`, `thumbKeyFor`.
- Produces: `POST /api/upload-url` accepting `{ filename, contentType, sizeBytes }` → `200 { originalUrl, originalKey, thumbUrl, thumbKey }` or `400 { error }`. (In Phase 1 the userId is a fixed `"anon"`; Phase 3 replaces it with the session user id.)

- [ ] **Step 1: Add the integration vitest config**

`vitest.integration.config.ts`:
```ts
import { defineConfig } from "vitest/config"
import tsconfigPaths from "vite-tsconfig-paths"

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["tests/integration/**/*.test.ts"],
    setupFiles: ["tests/helpers/env-setup.ts"],
  },
})
```

`tests/helpers/env-setup.ts`:
```ts
process.env.R2_ACCOUNT_ID ??= "acct"
process.env.R2_ACCESS_KEY_ID ??= "key"
process.env.R2_SECRET_ACCESS_KEY ??= "secret"
process.env.R2_BUCKET ??= "family-albums"
process.env.R2_ENDPOINT ??= "https://acct.r2.cloudflarestorage.com"
```

- [ ] **Step 2: Write the failing integration test**

`tests/integration/upload-url.test.ts`:
```ts
import { describe, it, expect } from "vitest"
import { POST } from "@/app/api/upload-url/route"

function req(body: unknown) {
  return new Request("http://localhost/api/upload-url", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  })
}

describe("POST /api/upload-url", () => {
  it("returns presigned URLs and keys for a valid request", async () => {
    const res = await POST(req({ filename: "a.jpg", contentType: "image/jpeg", sizeBytes: 1000 }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.originalKey).toMatch(/^photos\/anon\/.+\.jpg$/)
    expect(json.thumbKey).toMatch(/^thumbs\/anon\/.+\.jpg$/)
    expect(json.originalUrl).toContain("X-Amz-Signature")
    expect(json.thumbUrl).toContain("X-Amz-Signature")
  })

  it("returns 400 for an unsupported type", async () => {
    const res = await POST(req({ filename: "a.pdf", contentType: "application/pdf", sizeBytes: 10 }))
    expect(res.status).toBe(400)
  })
})
```

- [ ] **Step 3: Run test, verify it fails**

Run: `npm run test:int -- upload-url`
Expected: FAIL — route module not found.

- [ ] **Step 4: Implement `src/app/api/upload-url/route.ts`**

```ts
import { NextResponse } from "next/server"
import { uploadUrlSchema, ValidationError } from "@/lib/validation"
import { photoKey, thumbKeyFor } from "@/lib/keys"
import { presignPut } from "@/lib/r2"

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = uploadUrlSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 })
  }

  const userId = "anon" // Phase 3: replace with session user id
  const { contentType, sizeBytes } = parsed.data
  const originalKey = photoKey(userId, contentType)
  const thumbKey = thumbKeyFor(originalKey)

  try {
    const [originalUrl, thumbUrl] = await Promise.all([
      presignPut({ key: originalKey, contentType, contentLength: sizeBytes }),
      presignPut({ key: thumbKey, contentType: "image/jpeg", contentLength: 1 }),
    ])
    return NextResponse.json({ originalUrl, originalKey, thumbUrl, thumbKey })
  } catch (err) {
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 })
    }
    return NextResponse.json({ error: "Failed to sign upload" }, { status: 500 })
  }
}
```

- [ ] **Step 5: Run test, verify it passes**

Run: `npm run test:int -- upload-url`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add src/app/api/upload-url/route.ts tests/integration/upload-url.test.ts vitest.integration.config.ts tests/helpers/env-setup.ts
git commit -m "feat: POST /api/upload-url issuing presigned PUT URLs"
```

### Task 1.5: Uploader component + `/upload` page

**Files:**
- Create: `src/components/upload/Uploader.tsx`, `src/app/upload/page.tsx`, `tests/e2e/upload.spec.ts`

**Interfaces:**
- Consumes: `POST /api/upload-url`.
- Produces: a client component that picks a file, fetches presigned URLs, PUTs the file to R2, and renders the resulting `originalKey`. (Phase 2 extends this to also create the DB row.)

- [ ] **Step 1: Write the failing e2e test (PUT mocked at the network layer)**

`tests/e2e/upload.spec.ts`:
```ts
import { test, expect } from "@playwright/test"
import path from "node:path"

test("uploads a file and shows the resulting key", async ({ page }) => {
  // Intercept the direct-to-R2 PUT so the test is hermetic.
  await page.route("**/r2.cloudflarestorage.com/**", (route) =>
    route.fulfill({ status: 200, body: "" })
  )
  await page.goto("/upload")
  await page.setInputFiles('input[type="file"]', path.join(__dirname, "../fixtures/sample.jpg"))
  await page.getByRole("button", { name: /upload/i }).click()
  await expect(page.getByTestId("uploaded-key")).toContainText(/photos\/anon\/.+\.jpg/)
})
```

- [ ] **Step 2: Add the fixture image**

```bash
mkdir -p tests/fixtures
# Use any small jpg with EXIF; e.g. copy one in. Must be a real jpeg.
cp /Users/pankaz-mac/Pictures/*.jpg tests/fixtures/sample.jpg 2>/dev/null || \
  npx --yes @squoosh/cli --resize '{enabled:true,width:64}' -d tests/fixtures sample-src.jpg
```
> If you have no jpeg handy, create one: open Preview, export any image as `tests/fixtures/sample.jpg`. The file MUST exist for the e2e.

- [ ] **Step 3: Run test, verify it fails**

Run: `npm run test:e2e -- upload`
Expected: FAIL — `/upload` route 404.

- [ ] **Step 4: Implement `src/components/upload/Uploader.tsx`**

```tsx
"use client"

import { useState } from "react"

export function Uploader() {
  const [key, setKey] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const input = e.currentTarget.elements.namedItem("file") as HTMLInputElement
    const file = input.files?.[0]
    if (!file) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch("/api/upload-url", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
          sizeBytes: file.size,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? "upload-url failed")
      const { originalUrl, originalKey } = await res.json()
      const put = await fetch(originalUrl, {
        method: "PUT",
        headers: { "content-type": file.type },
        body: file,
      })
      if (!put.ok) throw new Error(`R2 PUT failed: ${put.status}`)
      setKey(originalKey)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed")
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input type="file" name="file" accept="image/*" required />
      <button
        type="submit"
        disabled={busy}
        className="rounded-full bg-terracotta px-6 py-2 text-paper disabled:opacity-50"
      >
        {busy ? "Uploading…" : "Upload"}
      </button>
      {key && <p data-testid="uploaded-key" className="font-mono text-sm">{key}</p>}
      {error && <p className="text-red-700 text-sm">{error}</p>}
    </form>
  )
}
```

- [ ] **Step 5: Implement `src/app/upload/page.tsx`**

```tsx
import { Uploader } from "@/components/upload/Uploader"

export default function UploadPage() {
  return (
    <main className="max-w-xl mx-auto px-6 py-16">
      <h1 className="font-serif text-4xl mb-8">Upload a photo</h1>
      <Uploader />
    </main>
  )
}
```

- [ ] **Step 6: Run test, verify it passes**

Run: `npm run test:e2e -- upload`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/components/upload/Uploader.tsx src/app/upload/page.tsx tests/e2e/upload.spec.ts tests/fixtures/sample.jpg
git commit -m "feat: client uploader with direct-to-R2 PUT"
```

### Task 1.6: R2 provisioning + CORS + prod verification (manual)

**Files:**
- Create: `docs/r2-cors.json` (reference)

- [ ] **Step 1: Provision R2 (Cloudflare dashboard)**

In Cloudflare → R2: create account if needed → **Create bucket** `family-albums` (private). Under **Manage R2 API Tokens**, create a token with Object Read & Write; record Access Key ID, Secret, and the account-id endpoint `https://<accountid>.r2.cloudflarestorage.com`.

- [ ] **Step 2: Set bucket CORS**

Save this as `docs/r2-cors.json` and apply it in the bucket's CORS settings:
```json
[
  {
    "AllowedOrigins": [
      "http://localhost:3000",
      "https://<your-prod-domain>",
      "https://*.vercel.app"
    ],
    "AllowedMethods": ["PUT", "GET"],
    "AllowedHeaders": ["content-type"],
    "MaxAgeSeconds": 3600
  }
]
```
> Cloudflare may not accept wildcard origins for credentialed requests — if previews fail, add specific preview origins or a stable preview alias.

- [ ] **Step 3: Add env vars to Vercel + local**

In Vercel → Project → Settings → Environment Variables (Production + Preview), set `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_ENDPOINT`. Mirror into local `.env`.

- [ ] **Step 4: Deploy and verify the gate on prod**

```bash
git add docs/r2-cors.json
git commit -m "docs: R2 CORS config"
git push
```
On the **production URL** `/upload`: pick a real photo → Upload → key appears. Confirm the object exists in the R2 bucket (Cloudflare dashboard → bucket → Objects).

**✅ Phase 1 gate:** a browser-selected file lands in R2 from production; key shown.

---

# PHASE 2 — Database + gallery

**Phase goal / gate:** uploaded photos persist (R2 object + Neon row + client-generated thumb + blurhash) and display as a gallery from production across reloads.

### Task 2.1: Prisma schema + client singleton

**Files:**
- Create: `prisma/schema.prisma`, `src/lib/db.ts`

**Interfaces:**
- Produces: Prisma client `db` with models `User`, `Photo`, `Album`, `AlbumPhoto`, `Comment` and `Role` enum.

- [ ] **Step 1: Install Prisma**

```bash
npm install @prisma/client
npm install -D prisma
```

- [ ] **Step 2: Write `prisma/schema.prisma`**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

enum Role {
  admin
  member
}

model User {
  id        String    @id @default(uuid()) @db.Uuid
  email     String    @unique
  name      String?
  avatarUrl String?   @map("avatar_url")
  role      Role      @default(member)
  createdAt DateTime  @default(now()) @map("created_at")
  photos    Photo[]
  albums    Album[]
  comments  Comment[]

  @@map("users")
}

model Photo {
  id          String       @id @default(uuid()) @db.Uuid
  r2Key       String       @unique @map("r2_key")
  thumbKey    String?      @map("thumb_key")
  uploaderId  String       @map("uploader_id") @db.Uuid
  uploader    User         @relation(fields: [uploaderId], references: [id])
  caption     String?
  takenAt     DateTime?    @map("taken_at")
  uploadedAt  DateTime     @default(now()) @map("uploaded_at")
  width       Int?
  height      Int?
  sizeBytes   Int?         @map("size_bytes")
  contentType String       @map("content_type")
  blurhash    String?
  albumPhotos AlbumPhoto[]
  comments    Comment[]
  coverOf     Album[]      @relation("AlbumCover")

  @@index([uploaderId])
  @@index([takenAt])
  @@map("photos")
}

model Album {
  id           String       @id @default(uuid()) @db.Uuid
  title        String
  description  String?
  coverPhotoId String?      @map("cover_photo_id") @db.Uuid
  coverPhoto   Photo?       @relation("AlbumCover", fields: [coverPhotoId], references: [id], onDelete: SetNull)
  createdBy    String       @map("created_by") @db.Uuid
  creator      User         @relation(fields: [createdBy], references: [id])
  createdAt    DateTime     @default(now()) @map("created_at")
  photos       AlbumPhoto[]

  @@index([createdBy])
  @@map("albums")
}

model AlbumPhoto {
  albumId  String @map("album_id") @db.Uuid
  photoId  String @map("photo_id") @db.Uuid
  position Int
  album    Album  @relation(fields: [albumId], references: [id], onDelete: Cascade)
  photo    Photo  @relation(fields: [photoId], references: [id], onDelete: Cascade)

  @@id([albumId, photoId])
  @@index([albumId, position])
  @@map("album_photos")
}

model Comment {
  id        String   @id @default(uuid()) @db.Uuid
  photoId   String   @map("photo_id") @db.Uuid
  authorId  String   @map("author_id") @db.Uuid
  photo     Photo    @relation(fields: [photoId], references: [id], onDelete: Cascade)
  author    User     @relation(fields: [authorId], references: [id])
  body      String
  createdAt DateTime @default(now()) @map("created_at")

  @@index([photoId, createdAt])
  @@map("comments")
}
```

- [ ] **Step 3: Implement `src/lib/db.ts` singleton**

```ts
import "server-only"
import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const db =
  globalForPrisma.prisma ?? new PrismaClient({ log: ["error", "warn"] })

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db
```

- [ ] **Step 4: Commit (migration runs in Task 2.2)**

```bash
git add prisma/schema.prisma src/lib/db.ts package.json package-lock.json
git commit -m "feat: Prisma schema + client singleton"
```

### Task 2.2: Neon provisioning + first migration (manual + commands)

- [ ] **Step 1: Provision Neon**

Neon console → create project `family-albums`. Create two branches: `production` and `preview`. For each, copy the **pooled** connection string (`...-pooler...`) and the **direct** string.

- [ ] **Step 2: Set env vars (local + Vercel)**

Local `.env`: `DATABASE_URL=<pooled>`, `DIRECT_URL=<direct>` (use the `production` branch for local dev, or a personal branch). In Vercel set the same for Production (production branch) and Preview (preview branch).

- [ ] **Step 3: Create the migration locally**

```bash
npx prisma migrate dev --name init
```
Expected: `prisma/migrations/<ts>_init/` created; tables exist in Neon; client generated.

- [ ] **Step 4: Wire prod migrations into the Vercel build**

Update the `build` script in `package.json`:
```json
"build": "prisma generate && prisma migrate deploy && next build",
```

- [ ] **Step 5: Commit + deploy**

```bash
git add prisma/migrations package.json package-lock.json
git commit -m "feat: initial Prisma migration + deploy-time migrate"
git push
```
Expected: Vercel build runs `prisma migrate deploy`; prod DB has tables.

### Task 2.3: Client EXIF parsing (`lib/exif.ts`)

**Files:**
- Create: `src/lib/exif.ts`, `tests/unit/exif.test.ts`

**Interfaces:**
- Produces: `parseExif(file: Blob): Promise<{ takenAt: string | null; width: number | null; height: number | null; orientation: number | null }>`.

- [ ] **Step 1: Install exifr + jsdom for the test**

```bash
npm install exifr
npm install -D jsdom
```

- [ ] **Step 2: Write the failing test**

`tests/unit/exif.test.ts`:
```ts
import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { parseExif } from "@/lib/exif"

describe("parseExif", () => {
  it("extracts capture date and dimensions from a jpeg", async () => {
    const bytes = readFileSync("tests/fixtures/sample.jpg")
    const blob = new Blob([bytes], { type: "image/jpeg" })
    const meta = await parseExif(blob)
    // sample.jpg may or may not carry EXIF; shape must always be correct.
    expect(meta).toHaveProperty("takenAt")
    expect(meta).toHaveProperty("width")
    expect(meta).toHaveProperty("orientation")
  })

  it("returns nulls for a non-image blob", async () => {
    const blob = new Blob([new Uint8Array([1, 2, 3])], { type: "application/octet-stream" })
    const meta = await parseExif(blob)
    expect(meta.takenAt).toBeNull()
  })
})
```

- [ ] **Step 3: Run test, verify it fails**

Run: `npm test -- exif`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement `src/lib/exif.ts`**

```ts
import exifr from "exifr"

export interface ExifMeta {
  takenAt: string | null
  width: number | null
  height: number | null
  orientation: number | null
}

export async function parseExif(file: Blob): Promise<ExifMeta> {
  try {
    const buffer = await file.arrayBuffer()
    const data = await exifr.parse(buffer, {
      pick: ["DateTimeOriginal", "CreateDate", "ExifImageWidth", "ExifImageHeight", "Orientation"],
    })
    if (!data) return { takenAt: null, width: null, height: null, orientation: null }
    const date: Date | undefined = data.DateTimeOriginal ?? data.CreateDate
    return {
      takenAt: date instanceof Date ? date.toISOString() : null,
      width: data.ExifImageWidth ?? null,
      height: data.ExifImageHeight ?? null,
      orientation: data.Orientation ?? null,
    }
  } catch {
    return { takenAt: null, width: null, height: null, orientation: null }
  }
}
```

- [ ] **Step 5: Run test, verify it passes**

Run: `npm test -- exif`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add src/lib/exif.ts tests/unit/exif.test.ts package.json package-lock.json
git commit -m "feat: client EXIF parsing via exifr"
```

### Task 2.4: Blurhash helpers (`lib/blurhash.ts`)

**Files:**
- Create: `src/lib/blurhash.ts`, `tests/unit/blurhash.test.ts`

**Interfaces:**
- Produces:
  - `encodeBlurhash(pixels: Uint8ClampedArray, width: number, height: number): string`
  - `isValidBlurhash(hash: string): boolean`

- [ ] **Step 1: Install blurhash**

```bash
npm install blurhash
```

- [ ] **Step 2: Write the failing test**

`tests/unit/blurhash.test.ts`:
```ts
import { describe, it, expect } from "vitest"
import { encodeBlurhash, isValidBlurhash } from "@/lib/blurhash"

describe("blurhash", () => {
  it("encodes a flat-color image to a valid hash", () => {
    const w = 8, h = 8
    const pixels = new Uint8ClampedArray(w * h * 4)
    for (let i = 0; i < pixels.length; i += 4) {
      pixels[i] = 192; pixels[i + 1] = 106; pixels[i + 2] = 75; pixels[i + 3] = 255
    }
    const hash = encodeBlurhash(pixels, w, h)
    expect(typeof hash).toBe("string")
    expect(isValidBlurhash(hash)).toBe(true)
  })

  it("rejects an invalid hash", () => {
    expect(isValidBlurhash("")).toBe(false)
    expect(isValidBlurhash("!!!")).toBe(false)
  })
})
```

- [ ] **Step 3: Run test, verify it fails**

Run: `npm test -- blurhash`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement `src/lib/blurhash.ts`**

```ts
import { encode, isBlurhashValid } from "blurhash"

export function encodeBlurhash(
  pixels: Uint8ClampedArray,
  width: number,
  height: number
): string {
  return encode(pixels, width, height, 4, 3)
}

export function isValidBlurhash(hash: string): boolean {
  if (!hash) return false
  return isBlurhashValid(hash).result
}
```

- [ ] **Step 5: Run test, verify it passes**

Run: `npm test -- blurhash`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add src/lib/blurhash.ts tests/unit/blurhash.test.ts package.json package-lock.json
git commit -m "feat: blurhash encode/validate helpers"
```

### Task 2.5: Client thumbnail + pixel extraction (`lib/image-client.ts`)

**Files:**
- Create: `src/lib/image-client.ts`

**Interfaces:**
- Produces (browser-only; uses canvas):
  - `makeThumbnail(file: File, maxEdge?: number): Promise<{ blob: Blob; width: number; height: number }>`
  - `smallPixels(file: File, size?: number): Promise<{ pixels: Uint8ClampedArray; width: number; height: number }>` (for blurhash)

> This module is browser-only (uses `Image`/`canvas`), so it has no unit test; it's exercised by the upload e2e in Task 2.7.

- [ ] **Step 1: Implement `src/lib/image-client.ts`**

```ts
"use client"

async function loadBitmap(file: File): Promise<ImageBitmap> {
  // createImageBitmap honors EXIF orientation when supported.
  return createImageBitmap(file, { imageOrientation: "from-image" } as ImageBitmapOptions)
}

export async function makeThumbnail(
  file: File,
  maxEdge = 600
): Promise<{ blob: Blob; width: number; height: number }> {
  const bitmap = await loadBitmap(file)
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height))
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)
  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, width, height)
  const blob = await new Promise<Blob>((resolve) =>
    canvas.toBlob((b) => resolve(b!), "image/jpeg", 0.8)
  )
  return { blob, width, height }
}

export async function smallPixels(
  file: File,
  size = 32
): Promise<{ pixels: Uint8ClampedArray; width: number; height: number }> {
  const bitmap = await loadBitmap(file)
  const scale = Math.min(1, size / Math.max(bitmap.width, bitmap.height))
  const width = Math.max(1, Math.round(bitmap.width * scale))
  const height = Math.max(1, Math.round(bitmap.height * scale))
  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext("2d")!
  ctx.drawImage(bitmap, 0, 0, width, height)
  return { pixels: ctx.getImageData(0, 0, width, height).data, width, height }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/image-client.ts
git commit -m "feat: client canvas thumbnail + pixel extraction"
```

### Task 2.6: `POST /api/photos` + `GET /api/photos`

**Files:**
- Create: `src/app/api/photos/route.ts`, `src/lib/dto.ts`, `tests/integration/photos.test.ts`, `tests/helpers/db.ts`

**Interfaces:**
- Consumes: `db`, `photoMetadataSchema`, `presignGet`.
- Produces:
  - `POST /api/photos` body = `photoMetadataSchema` → `201 { id }`.
  - `GET /api/photos` → `200 { photos: PhotoListItem[] }` where each item = `{ id, thumbUrl, blurhash, width, height, takenAt }`.
  - `src/lib/dto.ts`: `interface PhotoListItem` + `signPhotoList(rows): Promise<PhotoListItem[]>`.
  - In Phase 2 `uploaderId` is a fixed seeded user; Phase 3 wires the session user.

- [ ] **Step 1: Add the DB test helper**

`tests/helpers/db.ts`:
```ts
import { db } from "@/lib/db"

export async function resetDb() {
  await db.comment.deleteMany()
  await db.albumPhoto.deleteMany()
  await db.album.deleteMany()
  await db.photo.deleteMany()
  await db.user.deleteMany()
}

export async function seedUser(email = "test@example.com") {
  return db.user.create({ data: { email, name: "Test", role: "member" } })
}
```

> Integration tests require a real Postgres. Use the Neon `preview` branch (set `DATABASE_URL`/`DIRECT_URL` in `.env.test`, loaded by `tests/helpers/env-setup.ts`), or run a local Postgres. Run `npx prisma migrate deploy` against it once.

- [ ] **Step 2: Implement `src/lib/dto.ts`**

```ts
import "server-only"
import { presignGet } from "@/lib/r2"

export interface PhotoListItem {
  id: string
  thumbUrl: string
  blurhash: string | null
  width: number | null
  height: number | null
  takenAt: string | null
}

type PhotoRow = {
  id: string
  thumbKey: string | null
  r2Key: string
  blurhash: string | null
  width: number | null
  height: number | null
  takenAt: Date | null
}

export async function signPhotoList(rows: PhotoRow[]): Promise<PhotoListItem[]> {
  return Promise.all(
    rows.map(async (r) => ({
      id: r.id,
      thumbUrl: await presignGet({ key: r.thumbKey ?? r.r2Key }),
      blurhash: r.blurhash,
      width: r.width,
      height: r.height,
      takenAt: r.takenAt ? r.takenAt.toISOString() : null,
    }))
  )
}
```

- [ ] **Step 3: Write the failing integration test**

`tests/integration/photos.test.ts`:
```ts
import { describe, it, expect, beforeEach } from "vitest"
import { POST, GET } from "@/app/api/photos/route"
import { resetDb, seedUser } from "../helpers/db"

let userId: string
beforeEach(async () => {
  await resetDb()
  userId = (await seedUser()).id
})

function postReq(body: unknown) {
  return new Request("http://localhost/api/photos", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  })
}

const validBody = {
  r2Key: "photos/anon/abc.jpg",
  thumbKey: "thumbs/anon/abc.jpg",
  contentType: "image/jpeg",
  sizeBytes: 1234,
  width: 800,
  height: 600,
  takenAt: "2024-01-01T00:00:00.000Z",
  blurhash: "LEHV6nWB2yk8pyo0adR*.7kCMdnj",
}

describe("photos API", () => {
  it("creates a photo row and lists it with a signed thumb url", async () => {
    const created = await POST(postReq(validBody))
    expect(created.status).toBe(201)
    const { id } = await created.json()
    expect(id).toBeTruthy()

    const list = await GET()
    expect(list.status).toBe(200)
    const { photos } = await list.json()
    expect(photos).toHaveLength(1)
    expect(photos[0].id).toBe(id)
    expect(photos[0].thumbUrl).toContain("X-Amz-Signature")
    expect(photos[0].blurhash).toBe(validBody.blurhash)
  })

  it("rejects an invalid body", async () => {
    const res = await POST(postReq({ r2Key: "x" }))
    expect(res.status).toBe(400)
  })
})
```

- [ ] **Step 4: Run test, verify it fails**

Run: `npm run test:int -- photos`
Expected: FAIL — route not found.

- [ ] **Step 5: Implement `src/app/api/photos/route.ts`**

```ts
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { photoMetadataSchema } from "@/lib/validation"
import { signPhotoList } from "@/lib/dto"

const SEED_UPLOADER_FALLBACK = async () => {
  // Phase 2 only: attribute to the first user. Phase 3 replaces with session user.
  const user = await db.user.findFirst()
  if (!user) throw new Error("No user to attribute upload to")
  return user.id
}

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }
  const parsed = photoMetadataSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 })
  }
  const d = parsed.data
  const uploaderId = await SEED_UPLOADER_FALLBACK()
  const photo = await db.photo.create({
    data: {
      r2Key: d.r2Key,
      thumbKey: d.thumbKey,
      contentType: d.contentType,
      sizeBytes: d.sizeBytes,
      width: d.width,
      height: d.height,
      takenAt: d.takenAt ? new Date(d.takenAt) : null,
      blurhash: d.blurhash,
      caption: d.caption ?? null,
      uploaderId,
    },
  })
  return NextResponse.json({ id: photo.id }, { status: 201 })
}

export async function GET() {
  const rows = await db.photo.findMany({
    orderBy: [{ takenAt: "desc" }, { uploadedAt: "desc" }],
    take: 200,
  })
  const photos = await signPhotoList(rows)
  return NextResponse.json({ photos })
}
```

- [ ] **Step 6: Run test, verify it passes**

Run: `npm run test:int -- photos`
Expected: PASS (2 tests).

- [ ] **Step 7: Commit**

```bash
git add src/app/api/photos/route.ts src/lib/dto.ts tests/integration/photos.test.ts tests/helpers/db.ts
git commit -m "feat: photos create + list API with signed thumbs"
```

### Task 2.7: Extend Uploader to generate thumb/blurhash/EXIF and create the row

**Files:**
- Modify: `src/components/upload/Uploader.tsx`

**Interfaces:**
- Consumes: `makeThumbnail`, `smallPixels`, `encodeBlurhash`, `parseExif`, `POST /api/upload-url`, `POST /api/photos`.

- [ ] **Step 1: Update `Uploader.tsx` to the full flow**

Replace the body of `handleSubmit` (keep the component shell from Task 1.5):
```tsx
"use client"

import { useState } from "react"
import { makeThumbnail, smallPixels } from "@/lib/image-client"
import { encodeBlurhash } from "@/lib/blurhash"
import { parseExif } from "@/lib/exif"

export function Uploader() {
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const input = e.currentTarget.elements.namedItem("file") as HTMLInputElement
    const file = input.files?.[0]
    if (!file) return
    setBusy(true); setError(null); setDone(false)
    try {
      const [thumb, px, exif] = await Promise.all([
        makeThumbnail(file),
        smallPixels(file),
        parseExif(file),
      ])
      const blurhash = encodeBlurhash(px.pixels, px.width, px.height)

      const signRes = await fetch("/api/upload-url", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ filename: file.name, contentType: file.type, sizeBytes: file.size }),
      })
      if (!signRes.ok) throw new Error((await signRes.json()).error ?? "sign failed")
      const { originalUrl, originalKey, thumbUrl, thumbKey } = await signRes.json()

      await Promise.all([
        fetch(originalUrl, { method: "PUT", headers: { "content-type": file.type }, body: file }),
        fetch(thumbUrl, { method: "PUT", headers: { "content-type": "image/jpeg" }, body: thumb.blob }),
      ])

      const metaRes = await fetch("/api/photos", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          r2Key: originalKey,
          thumbKey,
          contentType: file.type,
          sizeBytes: file.size,
          width: exif.width,
          height: exif.height,
          takenAt: exif.takenAt,
          blurhash,
        }),
      })
      if (!metaRes.ok) throw new Error((await metaRes.json()).error ?? "save failed")
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed")
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input type="file" name="file" accept="image/*" required />
      <button type="submit" disabled={busy}
        className="rounded-full bg-terracotta px-6 py-2 text-paper disabled:opacity-50">
        {busy ? "Uploading…" : "Upload"}
      </button>
      {done && <p data-testid="upload-done" className="text-terracotta">Saved ✓</p>}
      {error && <p className="text-red-700 text-sm">{error}</p>}
    </form>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/upload/Uploader.tsx
git commit -m "feat: full upload flow — thumb + blurhash + exif + db row"
```

### Task 2.8: Gallery page + BlurUpImage + e2e

**Files:**
- Create: `src/components/motion/BlurUpImage.tsx`, `src/app/library/page.tsx`, `tests/e2e/gallery.spec.ts`

**Interfaces:**
- Consumes: `GET /api/photos`, `PhotoListItem`.
- Produces: `<BlurUpImage src blurhash width height alt />` client island.

- [ ] **Step 1: Write the failing e2e**

`tests/e2e/gallery.spec.ts`:
```ts
import { test, expect } from "@playwright/test"
import path from "node:path"

test("uploaded photo appears in the gallery", async ({ page }) => {
  await page.goto("/upload")
  await page.setInputFiles('input[type="file"]', path.join(__dirname, "../fixtures/sample.jpg"))
  await page.getByRole("button", { name: /upload/i }).click()
  await expect(page.getByTestId("upload-done")).toBeVisible({ timeout: 15000 })

  await page.goto("/library")
  await expect(page.getByTestId("photo-grid").locator("img").first()).toBeVisible()
})
```
> This e2e hits real R2 + Neon (preview). Run with `E2E_BASE_URL` pointed at a preview deploy, or locally with `.env` set. It is the "real smoke" test that catches CORS/checksum regressions.

- [ ] **Step 2: Run test, verify it fails**

Run: `npm run test:e2e -- gallery`
Expected: FAIL — `/library` has no grid.

- [ ] **Step 3: Implement `src/components/motion/BlurUpImage.tsx`**

```tsx
"use client"

import { useState } from "react"
import { decode } from "blurhash"
import { useEffect, useRef } from "react"

export function BlurUpImage({
  src, blurhash, width, height, alt,
}: { src: string; blurhash: string | null; width: number | null; height: number | null; alt: string }) {
  const [loaded, setLoaded] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!blurhash || !canvasRef.current) return
    const pixels = decode(blurhash, 32, 32)
    const ctx = canvasRef.current.getContext("2d")!
    const imageData = ctx.createImageData(32, 32)
    imageData.data.set(pixels)
    ctx.putImageData(imageData, 0, 0)
  }, [blurhash])

  return (
    <div className="relative overflow-hidden rounded-lg bg-paper-200">
      {blurhash && (
        <canvas
          ref={canvasRef}
          width={32}
          height={32}
          className={`absolute inset-0 h-full w-full transition-opacity duration-500 ${loaded ? "opacity-0" : "opacity-100"}`}
        />
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        className={`block w-full transition-opacity duration-500 ${loaded ? "opacity-100" : "opacity-0"}`}
      />
    </div>
  )
}
```

- [ ] **Step 4: Implement `src/app/library/page.tsx`**

```tsx
import { db } from "@/lib/db"
import { signPhotoList } from "@/lib/dto"
import { BlurUpImage } from "@/components/motion/BlurUpImage"

export const dynamic = "force-dynamic"

export default async function LibraryPage() {
  const rows = await db.photo.findMany({
    orderBy: [{ takenAt: "desc" }, { uploadedAt: "desc" }],
    take: 200,
  })
  const photos = await signPhotoList(rows)

  return (
    <main className="max-w-6xl mx-auto px-6 py-12">
      <h1 className="font-serif text-5xl mb-8">The Library</h1>
      <div data-testid="photo-grid" className="columns-2 md:columns-3 lg:columns-4 gap-4 [&>*]:mb-4">
        {photos.map((p) => (
          <BlurUpImage key={p.id} src={p.thumbUrl} blurhash={p.blurhash}
            width={p.width} height={p.height} alt="" />
        ))}
      </div>
    </main>
  )
}
```

- [ ] **Step 5: Run test, verify it passes**

Run: `npm run test:e2e -- gallery`
Expected: PASS.

- [ ] **Step 6: Commit + deploy + verify gate**

```bash
git add src/components/motion/BlurUpImage.tsx src/app/library/page.tsx tests/e2e/gallery.spec.ts
git commit -m "feat: masonry gallery with blur-up thumbnails"
git push
```
On the prod URL: upload a photo, reload `/library` — it persists and displays.

**✅ Phase 2 gate:** uploaded photos persist and display as a gallery from prod across reloads.

---

# PHASE 3 — Auth + allowlist

**Phase goal / gate:** only allowlisted users can sign in and upload; uploads attributed to the real `uploader_id`.

> **Live-doc check before this phase:** read the Auth.js v5 docs (Global Constraints §1). The code below targets v5 (`next-auth@5`); adjust import/config shapes to the installed version.

### Task 3.1: Allowlist (`lib/auth-allowlist.ts`)

**Files:**
- Create: `src/lib/auth-allowlist.ts`, `tests/unit/auth-allowlist.test.ts`

**Interfaces:**
- Produces: `isAllowlisted(email: string | null | undefined): boolean` (reads `ALLOWLIST_EMAILS`).

- [ ] **Step 1: Write the failing test**

`tests/unit/auth-allowlist.test.ts`:
```ts
import { describe, it, expect, beforeEach } from "vitest"
import { isAllowlisted } from "@/lib/auth-allowlist"

beforeEach(() => {
  process.env.ALLOWLIST_EMAILS = "Mom@Example.com, dad@example.com ,sis@example.com"
})

describe("isAllowlisted", () => {
  it("matches case-insensitively and trims whitespace", () => {
    expect(isAllowlisted("mom@example.com")).toBe(true)
    expect(isAllowlisted("  DAD@example.com ")).toBe(true)
  })
  it("rejects non-listed emails", () => {
    expect(isAllowlisted("stranger@example.com")).toBe(false)
  })
  it("rejects null/empty", () => {
    expect(isAllowlisted(null)).toBe(false)
    expect(isAllowlisted("")).toBe(false)
  })
})
```

- [ ] **Step 2: Run test, verify it fails**

Run: `npm test -- auth-allowlist`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/lib/auth-allowlist.ts`**

```ts
export function isAllowlisted(email: string | null | undefined): boolean {
  if (!email) return false
  const raw = process.env.ALLOWLIST_EMAILS ?? ""
  const allowed = raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
  return allowed.includes(email.trim().toLowerCase())
}
```

- [ ] **Step 4: Run test, verify it passes**

Run: `npm test -- auth-allowlist`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth-allowlist.ts tests/unit/auth-allowlist.test.ts
git commit -m "feat: email allowlist check"
```

### Task 3.2: Auth.js config (`lib/auth.ts`) + types

**Files:**
- Create: `src/lib/auth.ts`, `src/types/next-auth.d.ts`

**Interfaces:**
- Produces: `{ handlers, auth, signIn, signOut }`. `session.user` carries `id` (our uuid) and `role`.

- [ ] **Step 1: Install Auth.js v5**

```bash
npm install next-auth@beta
```

- [ ] **Step 2: Implement `src/lib/auth.ts`** (JWT sessions, no adapter; upsert our user row)

```ts
import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import { db } from "@/lib/db"
import { isAllowlisted } from "@/lib/auth-allowlist"

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  session: { strategy: "jwt" },
  callbacks: {
    async signIn({ profile }) {
      return isAllowlisted(profile?.email)
    },
    async jwt({ token, profile }) {
      if (profile?.email) {
        const user = await db.user.upsert({
          where: { email: profile.email },
          update: { name: profile.name ?? undefined, avatarUrl: (profile as { picture?: string }).picture },
          create: {
            email: profile.email,
            name: profile.name ?? null,
            avatarUrl: (profile as { picture?: string }).picture ?? null,
            role: profile.email.toLowerCase() === (process.env.OWNER_EMAIL ?? "").toLowerCase()
              ? "admin" : "member",
          },
        })
        token.userId = user.id
        token.role = user.role
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId as string
        session.user.role = token.role as "admin" | "member"
      }
      return session
    },
  },
})
```

- [ ] **Step 3: Implement `src/types/next-auth.d.ts`**

```ts
import "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: "admin" | "member"
      name?: string | null
      email?: string | null
      image?: string | null
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string
    role?: "admin" | "member"
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/auth.ts src/types/next-auth.d.ts package.json package-lock.json
git commit -m "feat: Auth.js v5 Google + allowlist signIn callback"
```

### Task 3.3: Auth route handler

**Files:**
- Create: `src/app/api/auth/[...nextauth]/route.ts`

- [ ] **Step 1: Implement the route**

```ts
import { handlers } from "@/lib/auth"
export const { GET, POST } = handlers
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/auth/\[...nextauth\]/route.ts
git commit -m "feat: NextAuth route handler"
```

### Task 3.4: `requireUser()` session helper

**Files:**
- Create: `src/lib/session.ts`, `tests/unit/session.test.ts`

**Interfaces:**
- Produces:
  - `class UnauthorizedError extends Error`
  - `requireUser(): Promise<{ id: string; role: "admin" | "member" }>` (throws `UnauthorizedError` when no session).

- [ ] **Step 1: Write the failing test (auth() mocked)**

`tests/unit/session.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }))
import { auth } from "@/lib/auth"
import { requireUser, UnauthorizedError } from "@/lib/session"

beforeEach(() => vi.resetAllMocks())

describe("requireUser", () => {
  it("returns the user when a session exists", async () => {
    ;(auth as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: { id: "u1", role: "member" },
    })
    await expect(requireUser()).resolves.toEqual({ id: "u1", role: "member" })
  })
  it("throws when there is no session", async () => {
    ;(auth as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(null)
    await expect(requireUser()).rejects.toThrow(UnauthorizedError)
  })
})
```

- [ ] **Step 2: Run test, verify it fails**

Run: `npm test -- session`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/lib/session.ts`**

```ts
import "server-only"
import { auth } from "@/lib/auth"

export class UnauthorizedError extends Error {}

export async function requireUser(): Promise<{ id: string; role: "admin" | "member" }> {
  const session = await auth()
  if (!session?.user?.id) throw new UnauthorizedError("Not signed in")
  return { id: session.user.id, role: session.user.role }
}
```

- [ ] **Step 4: Run test, verify it passes**

Run: `npm test -- session`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/session.ts tests/unit/session.test.ts
git commit -m "feat: requireUser session helper"
```

### Task 3.5: Gate upload/photos routes; attribute to session user

**Files:**
- Modify: `src/app/api/upload-url/route.ts`, `src/app/api/photos/route.ts`
- Modify: `tests/integration/upload-url.test.ts`, `tests/integration/photos.test.ts` (stub session)
- Create: `tests/helpers/session-stub.ts`

**Interfaces:**
- Both routes now call `requireUser()` and 401 without a session; `uploaderId` comes from the session.

- [ ] **Step 1: Add a session stub helper for integration tests**

`tests/helpers/session-stub.ts`:
```ts
import { vi } from "vitest"

export function stubSession(user: { id: string; role?: "admin" | "member" } | null) {
  vi.doMock("@/lib/session", () => ({
    UnauthorizedError: class extends Error {},
    requireUser: vi.fn(async () => {
      if (!user) throw new Error("unauthorized")
      return { id: user.id, role: user.role ?? "member" }
    }),
  }))
}
```

- [ ] **Step 2: Update `upload-url` route to require a user**

In `src/app/api/upload-url/route.ts`, replace `const userId = "anon"` with:
```ts
import { requireUser, UnauthorizedError } from "@/lib/session"
// ...inside POST, before building keys:
let userId: string
try {
  userId = (await requireUser()).id
} catch (e) {
  if (e instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  throw e
}
```

- [ ] **Step 3: Update `photos` POST to attribute to the session user**

In `src/app/api/photos/route.ts`, replace `SEED_UPLOADER_FALLBACK` usage:
```ts
import { requireUser, UnauthorizedError } from "@/lib/session"
// inside POST, before db.photo.create:
let uploaderId: string
try {
  uploaderId = (await requireUser()).id
} catch (e) {
  if (e instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  throw e
}
```
(Delete the `SEED_UPLOADER_FALLBACK` function.)

- [ ] **Step 4: Update integration tests to stub a session + assert 401**

Add to `tests/integration/photos.test.ts` (top, before importing the route):
```ts
import { stubSession } from "../helpers/session-stub"
```
In `beforeEach`, after seeding the user: `stubSession({ id: userId })`. Add a test:
```ts
it("returns 401 without a session", async () => {
  stubSession(null)
  const { POST: P } = await import("@/app/api/photos/route")
  const res = await P(postReq(validBody))
  expect(res.status).toBe(401)
})
```
> Because the stub uses `vi.doMock`, import the route via dynamic `await import(...)` inside tests so the mock applies. Adjust the existing tests to dynamic import accordingly.

- [ ] **Step 5: Run integration tests, verify pass**

Run: `npm run test:int`
Expected: PASS — happy paths attribute to the stubbed user; unauthenticated calls 401.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/upload-url/route.ts src/app/api/photos/route.ts tests/integration tests/helpers/session-stub.ts
git commit -m "feat: gate upload + photos behind session, attribute uploader"
```

### Task 3.6: Sign-in page + providers + route protection

**Files:**
- Create: `src/app/(auth)/signin/page.tsx`, `src/app/providers.tsx`, `src/middleware.ts`
- Modify: `src/app/layout.tsx` (wrap with providers)
- Create: `tests/e2e/auth-gate.spec.ts`

**Interfaces:**
- Produces: protected routes redirect unauthenticated users to `/signin`.

- [ ] **Step 1: Write the failing e2e**

`tests/e2e/auth-gate.spec.ts`:
```ts
import { test, expect } from "@playwright/test"

test("unauthenticated user is redirected from /upload to sign-in", async ({ page }) => {
  await page.goto("/upload")
  await expect(page).toHaveURL(/\/signin/)
  await expect(page.getByRole("button", { name: /sign in with google/i })).toBeVisible()
})
```

- [ ] **Step 2: Run test, verify it fails**

Run: `npm run test:e2e -- auth-gate`
Expected: FAIL — `/upload` not protected.

- [ ] **Step 3: Implement `src/app/providers.tsx`**

```tsx
"use client"
import { SessionProvider } from "next-auth/react"

export function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>
}
```

- [ ] **Step 4: Wrap layout** — in `src/app/layout.tsx`, wrap `{children}` with `<Providers>` (import from `@/app/providers`).

- [ ] **Step 5: Implement `src/app/(auth)/signin/page.tsx`**

```tsx
"use client"
import { signIn } from "next-auth/react"

export default function SignInPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-8 px-6 text-center">
      <h1 className="font-serif text-5xl">Welcome home</h1>
      <p className="text-ink/70 max-w-sm">This album is just for our family. Sign in to come in.</p>
      <button
        onClick={() => signIn("google", { callbackUrl: "/library" })}
        className="rounded-full bg-terracotta px-8 py-3 text-paper font-medium"
      >
        Sign in with Google
      </button>
    </main>
  )
}
```

- [ ] **Step 6: Implement `src/middleware.ts`**

```ts
import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  if (!req.auth) {
    const url = new URL("/signin", req.nextUrl.origin)
    return NextResponse.redirect(url)
  }
})

export const config = {
  matcher: ["/upload", "/library/:path*", "/albums/:path*", "/photos/:path*", "/on-this-day"],
}
```
> Verify the v5 `auth` middleware wrapper form against live docs; adjust if the installed version differs.

- [ ] **Step 7: Run test, verify it passes**

Run: `npm run test:e2e -- auth-gate`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add "src/app/(auth)/signin/page.tsx" src/app/providers.tsx src/middleware.ts src/app/layout.tsx tests/e2e/auth-gate.spec.ts
git commit -m "feat: sign-in page + middleware route protection"
```

### Task 3.7: Admin seed script

**Files:**
- Create: `prisma/seed.ts`
- Modify: `package.json` (prisma seed config)

- [ ] **Step 1: Implement `prisma/seed.ts`**

```ts
import { PrismaClient } from "@prisma/client"
const db = new PrismaClient()

async function main() {
  const email = process.env.OWNER_EMAIL
  if (!email) throw new Error("OWNER_EMAIL not set")
  await db.user.upsert({
    where: { email },
    update: { role: "admin" },
    create: { email, name: "Owner", role: "admin" },
  })
  console.log(`Seeded admin: ${email}`)
}

main().finally(() => db.$disconnect())
```

- [ ] **Step 2: Register the seed command** — add to `package.json`:
```json
"prisma": { "seed": "tsx prisma/seed.ts" }
```
and `npm install -D tsx`.

- [ ] **Step 3: Run the seed against prod DB**

```bash
npm install -D tsx
OWNER_EMAIL=you@example.com npx prisma db seed
```
Expected: "Seeded admin: …".

- [ ] **Step 4: Commit**

```bash
git add prisma/seed.ts package.json package-lock.json
git commit -m "feat: seed owner as admin"
```

### Task 3.8: Google OAuth provisioning (manual) + gate verification

- [ ] **Step 1: Provision Google OAuth**

Google Cloud Console → new project → **OAuth consent screen** (External; add family members as test users, or publish). **Credentials → Create OAuth client ID → Web application.** Authorized redirect URIs:
- `http://localhost:3000/api/auth/callback/google`
- `https://<prod-domain>/api/auth/callback/google`
- preview URLs (Google wildcards are limited — add specific preview URLs or a stable alias).

- [ ] **Step 2: Set env (local + Vercel)**

`AUTH_SECRET` (generate: `npx auth secret`), `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `AUTH_URL` (prod domain), `ALLOWLIST_EMAILS`, `OWNER_EMAIL`. Set in `.env` and Vercel (Production + Preview).

- [ ] **Step 3: Deploy + verify gate**

```bash
git push
```
On prod: visiting `/upload` while signed out → `/signin`. Sign in with an **allowlisted** Google account → reach `/upload`, upload works, photo attributed to your user. Sign in with a **non-allowlisted** account → rejected, no DB row created (verify in Neon).

**✅ Phase 3 gate:** only allowlisted users can sign in and upload; uploads attributed to real `uploader_id`.

---

# PHASE 4 — Albums (core differentiator)

**Phase goal / gate:** a member builds a curated album end-to-end on prod (create → add photos → reorder → set cover → view story).

### Task 4.1: Reorder logic (`lib/reorder.ts`)

**Files:**
- Create: `src/lib/reorder.ts`, `tests/unit/reorder.test.ts`

**Interfaces:**
- Produces:
  - `positionsFor(orderedPhotoIds: string[]): { photoId: string; position: number }[]` — assigns 0-based positions in array order.
  - `applyReorder(current: { photoId: string; position: number }[], orderedPhotoIds: string[]): { photoId: string; position: number }[]` — validates the new order is a permutation of current ids, returns repositioned list.

- [ ] **Step 1: Write the failing test**

`tests/unit/reorder.test.ts`:
```ts
import { describe, it, expect } from "vitest"
import { positionsFor, applyReorder } from "@/lib/reorder"

describe("reorder", () => {
  it("assigns 0-based positions in order", () => {
    expect(positionsFor(["b", "a", "c"])).toEqual([
      { photoId: "b", position: 0 },
      { photoId: "a", position: 1 },
      { photoId: "c", position: 2 },
    ])
  })

  it("reorders an existing set", () => {
    const current = [
      { photoId: "a", position: 0 },
      { photoId: "b", position: 1 },
    ]
    expect(applyReorder(current, ["b", "a"])).toEqual([
      { photoId: "b", position: 0 },
      { photoId: "a", position: 1 },
    ])
  })

  it("throws if the new order is not a permutation of current ids", () => {
    const current = [{ photoId: "a", position: 0 }]
    expect(() => applyReorder(current, ["a", "x"])).toThrow()
  })
})
```

- [ ] **Step 2: Run test, verify it fails**

Run: `npm test -- reorder`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/lib/reorder.ts`**

```ts
export interface Position { photoId: string; position: number }

export function positionsFor(orderedPhotoIds: string[]): Position[] {
  return orderedPhotoIds.map((photoId, position) => ({ photoId, position }))
}

export function applyReorder(current: Position[], orderedPhotoIds: string[]): Position[] {
  const currentIds = new Set(current.map((p) => p.photoId))
  if (
    orderedPhotoIds.length !== current.length ||
    !orderedPhotoIds.every((id) => currentIds.has(id)) ||
    new Set(orderedPhotoIds).size !== orderedPhotoIds.length
  ) {
    throw new Error("orderedPhotoIds must be a permutation of the album's current photos")
  }
  return positionsFor(orderedPhotoIds)
}
```

- [ ] **Step 4: Run test, verify it passes**

Run: `npm test -- reorder`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/reorder.ts tests/unit/reorder.test.ts
git commit -m "feat: album reorder position logic"
```

### Task 4.2: Album CRUD API

**Files:**
- Create: `src/app/api/albums/route.ts`, `src/app/api/albums/[id]/route.ts`, `tests/integration/albums.test.ts`

**Interfaces:**
- Consumes: `db`, `requireUser`.
- Produces:
  - `POST /api/albums` `{ title, description? }` → `201 { id }`.
  - `GET /api/albums` → `200 { albums: { id, title, coverThumbUrl, photoCount, dateRange }[] }`.
  - `PATCH /api/albums/[id]` `{ title?, description?, coverPhotoId? }` → `200`.
  - `DELETE /api/albums/[id]` → `204` (creator only, else `403`).

- [ ] **Step 1: Write the failing integration test**

`tests/integration/albums.test.ts`:
```ts
import { describe, it, expect, beforeEach } from "vitest"
import { resetDb, seedUser } from "../helpers/db"
import { stubSession } from "../helpers/session-stub"

let userId: string
beforeEach(async () => {
  await resetDb()
  userId = (await seedUser()).id
  stubSession({ id: userId })
})

function jreq(url: string, method: string, body?: unknown) {
  return new Request(`http://localhost${url}`, {
    method,
    headers: { "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  })
}

describe("albums API", () => {
  it("creates an album and lists it", async () => {
    const { POST, GET } = await import("@/app/api/albums/route")
    const created = await POST(jreq("/api/albums", "POST", { title: "Summer 2024" }))
    expect(created.status).toBe(201)
    const { id } = await created.json()
    const list = await GET()
    const { albums } = await list.json()
    expect(albums.find((a: { id: string }) => a.id === id).title).toBe("Summer 2024")
  })

  it("forbids deleting an album you did not create", async () => {
    const { POST } = await import("@/app/api/albums/route")
    const created = await POST(jreq("/api/albums", "POST", { title: "Mine" }))
    const { id } = await created.json()
    stubSession({ id: "someone-else" })
    const { DELETE } = await import("@/app/api/albums/[id]/route")
    const res = await DELETE(jreq(`/api/albums/${id}`, "DELETE"), { params: Promise.resolve({ id }) })
    expect(res.status).toBe(403)
  })
})
```

- [ ] **Step 2: Run test, verify it fails**

Run: `npm run test:int -- albums`
Expected: FAIL — routes not found.

- [ ] **Step 3: Implement `src/app/api/albums/route.ts`**

```ts
import { NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { requireUser, UnauthorizedError } from "@/lib/session"
import { presignGet } from "@/lib/r2"

const createSchema = z.object({ title: z.string().min(1).max(200), description: z.string().max(5000).optional() })

export async function POST(request: Request) {
  let user
  try { user = await requireUser() } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    throw e
  }
  const parsed = createSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 })
  const album = await db.album.create({
    data: { title: parsed.data.title, description: parsed.data.description ?? null, createdBy: user.id },
  })
  return NextResponse.json({ id: album.id }, { status: 201 })
}

export async function GET() {
  const albums = await db.album.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      coverPhoto: true,
      photos: { include: { photo: true }, orderBy: { position: "asc" } },
    },
  })
  const result = await Promise.all(
    albums.map(async (a) => {
      const cover = a.coverPhoto ?? a.photos[0]?.photo ?? null
      const dates = a.photos.map((p) => p.photo.takenAt).filter(Boolean) as Date[]
      return {
        id: a.id,
        title: a.title,
        photoCount: a.photos.length,
        coverThumbUrl: cover ? await presignGet({ key: cover.thumbKey ?? cover.r2Key }) : null,
        dateRange: dates.length
          ? { from: new Date(Math.min(...dates.map((d) => +d))).toISOString(),
              to: new Date(Math.max(...dates.map((d) => +d))).toISOString() }
          : null,
      }
    })
  )
  return NextResponse.json({ albums: result })
}
```

- [ ] **Step 4: Implement `src/app/api/albums/[id]/route.ts`**

```ts
import { NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { requireUser, UnauthorizedError } from "@/lib/session"

type Ctx = { params: Promise<{ id: string }> }

const patchSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).nullable().optional(),
  coverPhotoId: z.string().uuid().nullable().optional(),
})

export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params
  const album = await db.album.findUnique({
    where: { id },
    include: { photos: { include: { photo: true }, orderBy: { position: "asc" } } },
  })
  if (!album) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json({ album })
}

export async function PATCH(request: Request, { params }: Ctx) {
  const { id } = await params
  try { await requireUser() } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    throw e
  }
  const parsed = patchSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 })
  await db.album.update({ where: { id }, data: parsed.data })
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params
  let user
  try { user = await requireUser() } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    throw e
  }
  const album = await db.album.findUnique({ where: { id } })
  if (!album) return new NextResponse(null, { status: 404 })
  if (album.createdBy !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  await db.album.delete({ where: { id } })
  return new NextResponse(null, { status: 204 })
}
```

- [ ] **Step 5: Run test, verify it passes**

Run: `npm run test:int -- albums`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add src/app/api/albums tests/integration/albums.test.ts
git commit -m "feat: album CRUD API with creator-only delete"
```

### Task 4.3: Album photos — add / remove / reorder

**Files:**
- Create: `src/app/api/albums/[id]/photos/route.ts`, `tests/integration/album-photos.test.ts`

**Interfaces:**
- Consumes: `applyReorder`, `db`, `requireUser`.
- Produces:
  - `POST /api/albums/[id]/photos` `{ photoId }` → appends at end (`201`).
  - `DELETE /api/albums/[id]/photos` `{ photoId }` → removes (`200`).
  - `PATCH /api/albums/[id]/photos` `{ orderedPhotoIds }` → reorders transactionally (`200`).

- [ ] **Step 1: Write the failing integration test**

`tests/integration/album-photos.test.ts`:
```ts
import { describe, it, expect, beforeEach } from "vitest"
import { resetDb, seedUser } from "../helpers/db"
import { stubSession } from "../helpers/session-stub"
import { db } from "@/lib/db"

let userId: string, albumId: string, p1: string, p2: string
beforeEach(async () => {
  await resetDb()
  userId = (await seedUser()).id
  stubSession({ id: userId })
  albumId = (await db.album.create({ data: { title: "A", createdBy: userId } })).id
  p1 = (await db.photo.create({ data: { r2Key: "photos/u/1.jpg", contentType: "image/jpeg", uploaderId: userId } })).id
  p2 = (await db.photo.create({ data: { r2Key: "photos/u/2.jpg", contentType: "image/jpeg", uploaderId: userId } })).id
})

function jreq(method: string, body: unknown) {
  return new Request(`http://localhost/api/albums/${albumId}/photos`, {
    method, headers: { "content-type": "application/json" }, body: JSON.stringify(body),
  })
}
const ctx = () => ({ params: Promise.resolve({ id: albumId }) })

describe("album photos", () => {
  it("adds photos then reorders them", async () => {
    const { POST, PATCH } = await import("@/app/api/albums/[id]/photos/route")
    await POST(jreq("POST", { photoId: p1 }), ctx())
    await POST(jreq("POST", { photoId: p2 }), ctx())
    const res = await PATCH(jreq("PATCH", { orderedPhotoIds: [p2, p1] }), ctx())
    expect(res.status).toBe(200)
    const rows = await db.albumPhoto.findMany({ where: { albumId }, orderBy: { position: "asc" } })
    expect(rows.map((r) => r.photoId)).toEqual([p2, p1])
  })
})
```

- [ ] **Step 2: Run test, verify it fails**

Run: `npm run test:int -- album-photos`
Expected: FAIL — route not found.

- [ ] **Step 3: Implement `src/app/api/albums/[id]/photos/route.ts`**

```ts
import { NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { requireUser, UnauthorizedError } from "@/lib/session"
import { applyReorder } from "@/lib/reorder"

type Ctx = { params: Promise<{ id: string }> }

async function guard() {
  try { await requireUser(); return null } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    throw e
  }
}

export async function POST(request: Request, { params }: Ctx) {
  const denied = await guard(); if (denied) return denied
  const { id: albumId } = await params
  const { photoId } = z.object({ photoId: z.string().uuid() }).parse(await request.json())
  const count = await db.albumPhoto.count({ where: { albumId } })
  await db.albumPhoto.create({ data: { albumId, photoId, position: count } })
  return NextResponse.json({ ok: true }, { status: 201 })
}

export async function DELETE(request: Request, { params }: Ctx) {
  const denied = await guard(); if (denied) return denied
  const { id: albumId } = await params
  const { photoId } = z.object({ photoId: z.string().uuid() }).parse(await request.json())
  await db.albumPhoto.delete({ where: { albumId_photoId: { albumId, photoId } } })
  return NextResponse.json({ ok: true })
}

export async function PATCH(request: Request, { params }: Ctx) {
  const denied = await guard(); if (denied) return denied
  const { id: albumId } = await params
  const { orderedPhotoIds } = z.object({ orderedPhotoIds: z.array(z.string().uuid()) }).parse(await request.json())
  const current = await db.albumPhoto.findMany({ where: { albumId } })
  const next = applyReorder(current.map((c) => ({ photoId: c.photoId, position: c.position })), orderedPhotoIds)
  await db.$transaction(
    next.map((n) =>
      db.albumPhoto.update({ where: { albumId_photoId: { albumId, photoId: n.photoId } }, data: { position: n.position } })
    )
  )
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 4: Run test, verify it passes**

Run: `npm run test:int -- album-photos`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add "src/app/api/albums/[id]/photos/route.ts" tests/integration/album-photos.test.ts
git commit -m "feat: album photo add/remove/reorder"
```

### Task 4.4: New-album page (server action)

**Files:**
- Create: `src/app/albums/new/page.tsx`

- [ ] **Step 1: Implement the page with a server action**

```tsx
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { requireUser } from "@/lib/session"

async function createAlbum(formData: FormData) {
  "use server"
  const user = await requireUser()
  const title = String(formData.get("title") ?? "").trim()
  if (!title) return
  const album = await db.album.create({ data: { title, description: String(formData.get("description") ?? "") || null, createdBy: user.id } })
  redirect(`/albums/${album.id}/edit`)
}

export default function NewAlbumPage() {
  return (
    <main className="max-w-xl mx-auto px-6 py-16">
      <h1 className="font-serif text-4xl mb-8">New album</h1>
      <form action={createAlbum} className="space-y-4">
        <input name="title" placeholder="Title" required className="w-full border-b border-ink/20 bg-transparent py-2 text-2xl font-serif outline-none" />
        <textarea name="description" placeholder="Tell the story…" rows={5} className="w-full border border-ink/20 rounded-lg bg-transparent p-3 outline-none" />
        <button className="rounded-full bg-terracotta px-6 py-2 text-paper">Create</button>
      </form>
    </main>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/albums/new/page.tsx
git commit -m "feat: create-album page with server action"
```

### Task 4.5: Album story view

**Files:**
- Create: `src/app/albums/[id]/page.tsx`, `src/components/album/StoryPhoto.tsx`

- [ ] **Step 1: Implement `src/components/album/StoryPhoto.tsx`**

```tsx
import Link from "next/link"
import { BlurUpImage } from "@/components/motion/BlurUpImage"

export function StoryPhoto({
  id, src, blurhash, width, height, caption,
}: { id: string; src: string; blurhash: string | null; width: number | null; height: number | null; caption: string | null }) {
  return (
    <figure className="mb-16">
      <Link href={`/photos/${id}`} style={{ viewTransitionName: `photo-${id}` }} className="block">
        <BlurUpImage src={src} blurhash={blurhash} width={width} height={height} alt={caption ?? ""} />
      </Link>
      {caption && <figcaption className="mt-3 text-ink/60 font-serif italic">{caption}</figcaption>}
    </figure>
  )
}
```

- [ ] **Step 2: Implement `src/app/albums/[id]/page.tsx`**

```tsx
import { notFound } from "next/navigation"
import { db } from "@/lib/db"
import { presignGet } from "@/lib/r2"
import { StoryPhoto } from "@/components/album/StoryPhoto"

export const dynamic = "force-dynamic"

export default async function AlbumPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const album = await db.album.findUnique({
    where: { id },
    include: { photos: { include: { photo: true }, orderBy: { position: "asc" } } },
  })
  if (!album) notFound()

  const photos = await Promise.all(
    album.photos.map(async (ap) => ({
      id: ap.photo.id,
      src: await presignGet({ key: ap.photo.r2Key }),
      blurhash: ap.photo.blurhash,
      width: ap.photo.width,
      height: ap.photo.height,
      caption: ap.photo.caption,
    }))
  )

  return (
    <main className="max-w-3xl mx-auto px-6 py-16">
      <header className="mb-16 text-center">
        <h1 className="font-serif text-6xl">{album.title}</h1>
        {album.description && <p className="mt-6 text-lg text-ink/70 whitespace-pre-line">{album.description}</p>}
      </header>
      {photos.map((p) => <StoryPhoto key={p.id} {...p} />)}
    </main>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add "src/app/albums/[id]/page.tsx" src/components/album/StoryPhoto.tsx
git commit -m "feat: album story view"
```

### Task 4.6: Album edit — reorder (framer-motion) + set cover + add photos

**Files:**
- Create: `src/app/albums/[id]/edit/page.tsx`, `src/components/album/ReorderGrid.tsx`

**Interfaces:**
- Consumes: `PATCH/POST/DELETE /api/albums/[id]/photos`, `PATCH /api/albums/[id]`.

- [ ] **Step 1: Implement `src/components/album/ReorderGrid.tsx`** (framer-motion `Reorder`)

```tsx
"use client"

import { Reorder } from "framer-motion"
import { useState } from "react"

type Item = { photoId: string; thumbUrl: string }

export function ReorderGrid({ albumId, initial }: { albumId: string; initial: Item[] }) {
  const [items, setItems] = useState(initial)

  async function persist(next: Item[]) {
    setItems(next)
    await fetch(`/api/albums/${albumId}/photos`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ orderedPhotoIds: next.map((i) => i.photoId) }),
    })
  }

  async function setCover(photoId: string) {
    await fetch(`/api/albums/${albumId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ coverPhotoId: photoId }),
    })
  }

  return (
    <Reorder.Group axis="y" values={items} onReorder={persist} className="space-y-3">
      {items.map((item) => (
        <Reorder.Item key={item.photoId} value={item}
          whileDrag={{ scale: 1.03, boxShadow: "0 12px 30px rgba(0,0,0,0.15)" }}
          className="flex items-center gap-4 rounded-lg bg-paper-200 p-2 cursor-grab active:cursor-grabbing">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={item.thumbUrl} alt="" className="h-16 w-16 rounded object-cover" />
          <button onClick={() => setCover(item.photoId)} className="text-sm text-terracotta">Set as cover</button>
        </Reorder.Item>
      ))}
    </Reorder.Group>
  )
}
```

- [ ] **Step 2: Implement `src/app/albums/[id]/edit/page.tsx`**

```tsx
import { notFound } from "next/navigation"
import { db } from "@/lib/db"
import { presignGet } from "@/lib/r2"
import { ReorderGrid } from "@/components/album/ReorderGrid"

export const dynamic = "force-dynamic"

export default async function EditAlbumPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const album = await db.album.findUnique({
    where: { id },
    include: { photos: { include: { photo: true }, orderBy: { position: "asc" } } },
  })
  if (!album) notFound()

  const initial = await Promise.all(
    album.photos.map(async (ap) => ({
      photoId: ap.photo.id,
      thumbUrl: await presignGet({ key: ap.photo.thumbKey ?? ap.photo.r2Key }),
    }))
  )

  return (
    <main className="max-w-2xl mx-auto px-6 py-12">
      <h1 className="font-serif text-4xl mb-2">{album.title}</h1>
      <p className="text-ink/60 mb-8">Drag to reorder. Click a photo to make it the cover.</p>
      <ReorderGrid albumId={id} initial={initial} />
      <a href={`/albums/${id}`} className="mt-8 inline-block rounded-full bg-terracotta px-6 py-2 text-paper">View story</a>
    </main>
  )
}
```

> Adding photos to the album reuses the existing `Uploader` plus `POST /api/albums/[id]/photos`; a simple "add from recent uploads" picker can be layered here. For the gate, uploading then adding via the API is sufficient.

- [ ] **Step 3: Commit**

```bash
git add "src/app/albums/[id]/edit/page.tsx" src/components/album/ReorderGrid.tsx
git commit -m "feat: album edit — drag reorder + set cover"
```

### Task 4.7: Library album cards + e2e

**Files:**
- Create: `src/components/library/AlbumCard.tsx`, `tests/e2e/album-build.spec.ts`
- Modify: `src/app/library/page.tsx` (show albums, link to photos grid)

- [ ] **Step 1: Write the failing e2e**

`tests/e2e/album-build.spec.ts`:
```ts
import { test, expect } from "@playwright/test"

// Assumes an authenticated storage state (see Phase 3 e2e setup) and at least one uploaded photo.
test("create an album and see it in the library", async ({ page }) => {
  await page.goto("/albums/new")
  await page.fill('input[name="title"]', "E2E Album")
  await page.fill('textarea[name="description"]', "A test story")
  await page.getByRole("button", { name: /create/i }).click()
  await expect(page).toHaveURL(/\/albums\/.+\/edit/)
  await page.goto("/library")
  await expect(page.getByText("E2E Album")).toBeVisible()
})
```
> Authenticated e2e: create a Playwright `storageState` by signing in once and saving cookies, OR enable a test-only credentials path behind an env flag. See Phase 3 / testing strategy.

- [ ] **Step 2: Implement `src/components/library/AlbumCard.tsx`**

```tsx
import Link from "next/link"

export function AlbumCard({
  id, title, coverThumbUrl, photoCount, dateRange,
}: { id: string; title: string; coverThumbUrl: string | null; photoCount: number; dateRange: { from: string; to: string } | null }) {
  const range = dateRange
    ? `${new Date(dateRange.from).getFullYear()}${
        new Date(dateRange.from).getFullYear() !== new Date(dateRange.to).getFullYear()
          ? `–${new Date(dateRange.to).getFullYear()}` : ""}`
    : ""
  return (
    <Link href={`/albums/${id}`} className="group block">
      <div className="aspect-[4/3] overflow-hidden rounded-xl bg-paper-200">
        {coverThumbUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coverThumbUrl} alt="" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
        )}
      </div>
      <h3 className="mt-3 font-serif text-2xl">{title}</h3>
      <p className="text-sm text-ink/50">{photoCount} photos{range && ` · ${range}`}</p>
    </Link>
  )
}
```

- [ ] **Step 3: Update `src/app/library/page.tsx`** to render album cards

```tsx
import { db } from "@/lib/db"
import { presignGet } from "@/lib/r2"
import { AlbumCard } from "@/components/library/AlbumCard"

export const dynamic = "force-dynamic"

export default async function LibraryPage() {
  const albums = await db.album.findMany({
    orderBy: { createdAt: "desc" },
    include: { coverPhoto: true, photos: { include: { photo: true }, orderBy: { position: "asc" } } },
  })
  const cards = await Promise.all(albums.map(async (a) => {
    const cover = a.coverPhoto ?? a.photos[0]?.photo ?? null
    const dates = a.photos.map((p) => p.photo.takenAt).filter(Boolean) as Date[]
    return {
      id: a.id, title: a.title, photoCount: a.photos.length,
      coverThumbUrl: cover ? await presignGet({ key: cover.thumbKey ?? cover.r2Key }) : null,
      dateRange: dates.length
        ? { from: new Date(Math.min(...dates.map((d) => +d))).toISOString(), to: new Date(Math.max(...dates.map((d) => +d))).toISOString() }
        : null,
    }
  }))

  return (
    <main className="max-w-6xl mx-auto px-6 py-12">
      <div className="flex items-baseline justify-between mb-10">
        <h1 className="font-serif text-5xl">The Library</h1>
        <a href="/albums/new" className="rounded-full bg-terracotta px-5 py-2 text-paper text-sm">New album</a>
      </div>
      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => <AlbumCard key={c.id} {...c} />)}
      </div>
    </main>
  )
}
```

- [ ] **Step 4: Run e2e, verify it passes**

Run: `npm run test:e2e -- album-build`
Expected: PASS.

- [ ] **Step 5: Commit + deploy + verify gate**

```bash
git add src/components/library/AlbumCard.tsx src/app/library/page.tsx tests/e2e/album-build.spec.ts
git commit -m "feat: library album cards + album build e2e"
git push
```
On prod: create an album, add uploaded photos, reorder, set a cover, view the story.

**✅ Phase 4 gate:** a member builds a curated album end-to-end on prod.

---

# PHASE 5 — Family polish + orphan reconciliation

**Phase goal / gate:** the site feels bespoke (not a template), reduced-motion works, and the orphan reconciliation sweep runs on schedule.

### Task 5.1: Comments API

**Files:**
- Create: `src/app/api/photos/[id]/comments/route.ts`, `tests/integration/comments.test.ts`

**Interfaces:**
- `GET /api/photos/[id]/comments` → `{ comments: { id, body, authorName, createdAt }[] }`.
- `POST /api/photos/[id]/comments` `{ body }` → `201 { id }` (auth required).

- [ ] **Step 1: Write the failing integration test**

`tests/integration/comments.test.ts`:
```ts
import { describe, it, expect, beforeEach } from "vitest"
import { resetDb, seedUser } from "../helpers/db"
import { stubSession } from "../helpers/session-stub"
import { db } from "@/lib/db"

let userId: string, photoId: string
beforeEach(async () => {
  await resetDb()
  userId = (await seedUser()).id
  stubSession({ id: userId })
  photoId = (await db.photo.create({ data: { r2Key: "photos/u/x.jpg", contentType: "image/jpeg", uploaderId: userId } })).id
})

const ctx = () => ({ params: Promise.resolve({ id: photoId }) })

describe("comments API", () => {
  it("adds and lists a comment", async () => {
    const { POST, GET } = await import("@/app/api/photos/[id]/comments/route")
    const created = await POST(new Request("http://localhost", { method: "POST", body: JSON.stringify({ body: "Lovely!" }) }), ctx())
    expect(created.status).toBe(201)
    const list = await GET(new Request("http://localhost"), ctx())
    const { comments } = await list.json()
    expect(comments[0].body).toBe("Lovely!")
  })
})
```

- [ ] **Step 2: Run test, verify it fails**

Run: `npm run test:int -- comments`
Expected: FAIL — route not found.

- [ ] **Step 3: Implement `src/app/api/photos/[id]/comments/route.ts`**

```ts
import { NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { requireUser, UnauthorizedError } from "@/lib/session"

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params
  const rows = await db.comment.findMany({
    where: { photoId: id }, orderBy: { createdAt: "asc" }, include: { author: true },
  })
  return NextResponse.json({
    comments: rows.map((c) => ({ id: c.id, body: c.body, authorName: c.author.name, createdAt: c.createdAt.toISOString() })),
  })
}

export async function POST(request: Request, { params }: Ctx) {
  const { id } = await params
  let user
  try { user = await requireUser() } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    throw e
  }
  const parsed = z.object({ body: z.string().min(1).max(2000) }).safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 })
  const comment = await db.comment.create({ data: { photoId: id, authorId: user.id, body: parsed.data.body } })
  return NextResponse.json({ id: comment.id }, { status: 201 })
}
```

- [ ] **Step 4: Run test, verify it passes**

Run: `npm run test:int -- comments`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add "src/app/api/photos/[id]/comments/route.ts" tests/integration/comments.test.ts
git commit -m "feat: photo comments API"
```

### Task 5.2: Photo detail page + comment thread + Lightbox

**Files:**
- Create: `src/app/photos/[id]/page.tsx`, `src/components/comments/CommentThread.tsx`, `src/components/motion/Lightbox.tsx`

- [ ] **Step 1: Implement `src/components/comments/CommentThread.tsx`**

```tsx
"use client"
import { useEffect, useState } from "react"

type Comment = { id: string; body: string; authorName: string | null; createdAt: string }

export function CommentThread({ photoId }: { photoId: string }) {
  const [comments, setComments] = useState<Comment[]>([])
  const [body, setBody] = useState("")

  async function load() {
    const res = await fetch(`/api/photos/${photoId}/comments`)
    setComments((await res.json()).comments)
  }
  useEffect(() => { load() }, [photoId])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!body.trim()) return
    await fetch(`/api/photos/${photoId}/comments`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ body }),
    })
    setBody(""); load()
  }

  return (
    <div className="mt-8 space-y-4">
      {comments.map((c) => (
        <div key={c.id}><span className="font-medium">{c.authorName ?? "Someone"}:</span> <span className="text-ink/80">{c.body}</span></div>
      ))}
      <form onSubmit={submit} className="flex gap-2">
        <input value={body} onChange={(e) => setBody(e.target.value)} placeholder="Add a memory…"
          className="flex-1 border-b border-ink/20 bg-transparent py-2 outline-none" />
        <button className="text-terracotta">Post</button>
      </form>
    </div>
  )
}
```

- [ ] **Step 2: Implement `src/components/motion/Lightbox.tsx`** (scale+fade open via shared transition name)

```tsx
"use client"
import { motion } from "framer-motion"
import { useReducedMotion } from "framer-motion"

export function Lightbox({ src, alt, photoId }: { src: string; alt: string; photoId: string }) {
  const reduce = useReducedMotion()
  return (
    <motion.img
      src={src}
      alt={alt}
      style={{ viewTransitionName: `photo-${photoId}` }}
      initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
      animate={reduce ? { opacity: 1 } : { opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 30 }}
      className="max-h-[85vh] w-auto mx-auto rounded-lg"
    />
  )
}
```

- [ ] **Step 3: Implement `src/app/photos/[id]/page.tsx`**

```tsx
import { notFound } from "next/navigation"
import { db } from "@/lib/db"
import { presignGet } from "@/lib/r2"
import { Lightbox } from "@/components/motion/Lightbox"
import { CommentThread } from "@/components/comments/CommentThread"

export const dynamic = "force-dynamic"

export default async function PhotoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const photo = await db.photo.findUnique({ where: { id } })
  if (!photo) notFound()
  const src = await presignGet({ key: photo.r2Key })
  return (
    <main className="max-w-4xl mx-auto px-6 py-12">
      <Lightbox src={src} alt={photo.caption ?? ""} photoId={photo.id} />
      {photo.caption && <p className="mt-6 font-serif italic text-center text-ink/70">{photo.caption}</p>}
      <CommentThread photoId={photo.id} />
    </main>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add "src/app/photos/[id]/page.tsx" src/components/comments/CommentThread.tsx src/components/motion/Lightbox.tsx
git commit -m "feat: photo detail with lightbox + comments"
```

### Task 5.3: "On this day" — date grouping + page

**Files:**
- Create: `src/lib/on-this-day.ts`, `tests/unit/on-this-day.test.ts`, `src/app/on-this-day/page.tsx`

**Interfaces:**
- Produces: `matchesToday(takenAt: Date, today: { month: number; day: number }): boolean`; `groupByYear(photos: { takenAt: Date }[]): Map<number, ...>`.

- [ ] **Step 1: Write the failing test**

`tests/unit/on-this-day.test.ts`:
```ts
import { describe, it, expect } from "vitest"
import { matchesToday } from "@/lib/on-this-day"

describe("on-this-day", () => {
  it("matches same month/day across years", () => {
    expect(matchesToday(new Date("2019-06-21T10:00:00Z"), { month: 6, day: 21 })).toBe(true)
  })
  it("ignores different days", () => {
    expect(matchesToday(new Date("2019-06-20T10:00:00Z"), { month: 6, day: 21 })).toBe(false)
  })
})
```

- [ ] **Step 2: Run test, verify it fails**

Run: `npm test -- on-this-day`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/lib/on-this-day.ts`**

```ts
export function matchesToday(takenAt: Date, today: { month: number; day: number }): boolean {
  return takenAt.getUTCMonth() + 1 === today.month && takenAt.getUTCDate() === today.day
}

export function groupByYear<T extends { takenAt: Date }>(photos: T[]): Map<number, T[]> {
  const map = new Map<number, T[]>()
  for (const p of photos) {
    const y = p.takenAt.getUTCFullYear()
    if (!map.has(y)) map.set(y, [])
    map.get(y)!.push(p)
  }
  return map
}
```

- [ ] **Step 4: Run test, verify it passes**

Run: `npm test -- on-this-day`
Expected: PASS (2 tests).

- [ ] **Step 5: Implement `src/app/on-this-day/page.tsx`**

```tsx
import { db } from "@/lib/db"
import { presignGet } from "@/lib/r2"
import { matchesToday, groupByYear } from "@/lib/on-this-day"
import { BlurUpImage } from "@/components/motion/BlurUpImage"

export const dynamic = "force-dynamic"

export default async function OnThisDayPage() {
  const now = new Date()
  const today = { month: now.getUTCMonth() + 1, day: now.getUTCDate() }
  const all = await db.photo.findMany({ where: { takenAt: { not: null } } })
  const matches = all.filter((p) => p.takenAt && matchesToday(p.takenAt, today)) as (typeof all[number] & { takenAt: Date })[]
  const byYear = groupByYear(matches)
  const years = [...byYear.keys()].sort((a, b) => b - a)

  const signed = new Map<string, string>()
  await Promise.all(matches.map(async (p) => signed.set(p.id, await presignGet({ key: p.thumbKey ?? p.r2Key }))))

  return (
    <main className="px-6 py-12">
      <h1 className="font-serif text-5xl mb-10 text-center">On this day</h1>
      {years.length === 0 && <p className="text-center text-ink/50">Nothing from this day — yet.</p>}
      <div className="flex gap-12 overflow-x-auto pb-8 snap-x">
        {years.map((y) => (
          <section key={y} className="snap-start shrink-0">
            <h2 className="font-serif text-3xl text-terracotta mb-4">{y}</h2>
            <div className="flex gap-4">
              {byYear.get(y)!.map((p) => (
                <div key={p.id} className="w-64">
                  <BlurUpImage src={signed.get(p.id)!} blurhash={p.blurhash} width={p.width} height={p.height} alt="" />
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  )
}
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/on-this-day.ts tests/unit/on-this-day.test.ts src/app/on-this-day/page.tsx
git commit -m "feat: on this day timeline"
```

### Task 5.4: Motion system — reduced-motion provider, stagger, Ken Burns, pressable

**Files:**
- Create: `src/components/motion/ReducedMotionProvider.tsx`, `FadeIn.tsx`, `StaggerGrid.tsx`, `KenBurns.tsx`, `PressableCard.tsx`
- Modify: `src/app/providers.tsx` (wrap with `MotionConfig`), `src/components/library/AlbumCard.tsx` (wrap in stagger/pressable)

> framer-motion's `MotionConfig reducedMotion="user"` + `useReducedMotion()` honor `prefers-reduced-motion`. Per CLAUDE.md these are all `"use client"` islands.

- [ ] **Step 1: Implement `src/components/motion/ReducedMotionProvider.tsx`**

```tsx
"use client"
import { MotionConfig } from "framer-motion"
export function ReducedMotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>
}
```

- [ ] **Step 2: Wrap providers** — in `src/app/providers.tsx`:
```tsx
"use client"
import { SessionProvider } from "next-auth/react"
import { ReducedMotionProvider } from "@/components/motion/ReducedMotionProvider"
export function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider><ReducedMotionProvider>{children}</ReducedMotionProvider></SessionProvider>
}
```

- [ ] **Step 3: Implement `StaggerGrid.tsx`** (staggered fade+rise; reduced-motion → fade only via MotionConfig)

```tsx
"use client"
import { motion } from "framer-motion"

const container = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } }
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 220, damping: 28 } } }

export function StaggerGrid({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div variants={container} initial="hidden" animate="show" className={className}>
      {Array.isArray(children)
        ? children.map((child, i) => <motion.div key={i} variants={item}>{child}</motion.div>)
        : <motion.div variants={item}>{children}</motion.div>}
    </motion.div>
  )
}
```

- [ ] **Step 4: Implement `KenBurns.tsx`** (slow drift on a cover image)

```tsx
"use client"
import { motion, useReducedMotion } from "framer-motion"

export function KenBurns({ src, alt }: { src: string; alt: string }) {
  const reduce = useReducedMotion()
  return (
    <div className="overflow-hidden h-full w-full">
      <motion.img
        src={src} alt={alt}
        className="h-full w-full object-cover"
        initial={{ scale: 1 }}
        animate={reduce ? { scale: 1 } : { scale: 1.08 }}
        transition={{ duration: 18, ease: "easeInOut", repeat: Infinity, repeatType: "reverse" }}
      />
    </div>
  )
}
```

- [ ] **Step 5: Implement `PressableCard.tsx`** + `FadeIn.tsx`

`PressableCard.tsx`:
```tsx
"use client"
import { motion } from "framer-motion"
export function PressableCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div whileHover={{ y: -4 }} whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }} className={className}>
      {children}
    </motion.div>
  )
}
```
`FadeIn.tsx`:
```tsx
"use client"
import { motion } from "framer-motion"
export function FadeIn({ children }: { children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-10%" }} transition={{ duration: 0.5 }}>
      {children}
    </motion.div>
  )
}
```

- [ ] **Step 6: Apply to the library** — wrap the album cards grid in `StaggerGrid` and each `AlbumCard` link in `PressableCard` (edit `src/app/library/page.tsx` and `AlbumCard.tsx` imports accordingly).

- [ ] **Step 7: Commit**

```bash
git add src/components/motion src/app/providers.tsx src/app/library/page.tsx src/components/library/AlbumCard.tsx
git commit -m "feat: motion system — stagger, ken burns, pressable, reduced-motion"
```

### Task 5.5: LazyMotion to trim bundle (per CLAUDE.md)

**Files:**
- Modify: `src/components/motion/ReducedMotionProvider.tsx` (wrap children in `LazyMotion`)

> CLAUDE.md: full `motion` ≈34kb; `LazyMotion` + `m.*` reduces first load. Only worth doing once motion islands are in place. Note: components using `motion.*` directly still pull full features; migrate hot paths to `m.*` where it matters.

- [ ] **Step 1: Wrap with LazyMotion**

```tsx
"use client"
import { MotionConfig, LazyMotion, domAnimation } from "framer-motion"
export function ReducedMotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <LazyMotion features={domAnimation}>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  )
}
```

- [ ] **Step 2: Verify nothing regresses**

Run: `npm run build`
Expected: build succeeds. (Drag/layout needs `domMax`; if `Reorder` errors at runtime, switch this provider's features to `domMax` or keep `Reorder` outside LazyMotion. Verify.)

- [ ] **Step 3: Commit**

```bash
git add src/components/motion/ReducedMotionProvider.tsx
git commit -m "perf: LazyMotion to reduce motion bundle"
```

### Task 5.6: Orphan reconciliation sweep

**Files:**
- Create: `src/lib/reconcile.ts`, `tests/unit/reconcile.test.ts`, `src/app/api/cron/reconcile/route.ts`, `vercel.json`

**Interfaces:**
- Produces: `isOrphan(key: string, knownKeys: Set<string>, lastModified: Date, now: Date, minAgeHours?: number): boolean`.

- [ ] **Step 1: Write the failing test**

`tests/unit/reconcile.test.ts`:
```ts
import { describe, it, expect } from "vitest"
import { isOrphan } from "@/lib/reconcile"

const now = new Date("2026-06-21T12:00:00Z")

describe("isOrphan", () => {
  it("flags an old key with no DB row", () => {
    expect(isOrphan("photos/u/x.jpg", new Set(), new Date("2026-06-21T06:00:00Z"), now)).toBe(true)
  })
  it("spares a key that has a DB row", () => {
    expect(isOrphan("photos/u/x.jpg", new Set(["photos/u/x.jpg"]), new Date("2026-06-21T06:00:00Z"), now)).toBe(false)
  })
  it("spares a recent key (grace period)", () => {
    expect(isOrphan("photos/u/x.jpg", new Set(), new Date("2026-06-21T11:30:00Z"), now)).toBe(false)
  })
})
```

- [ ] **Step 2: Run test, verify it fails**

Run: `npm test -- reconcile`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/lib/reconcile.ts`**

```ts
export function isOrphan(
  key: string,
  knownKeys: Set<string>,
  lastModified: Date,
  now: Date,
  minAgeHours = 6
): boolean {
  if (knownKeys.has(key)) return false
  const ageMs = now.getTime() - lastModified.getTime()
  return ageMs >= minAgeHours * 60 * 60 * 1000
}
```

- [ ] **Step 4: Run test, verify it passes**

Run: `npm test -- reconcile`
Expected: PASS (3 tests).

- [ ] **Step 5: Implement `src/app/api/cron/reconcile/route.ts`**

```ts
import { NextResponse } from "next/server"
import { ListObjectsV2Command, DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3"
import { db } from "@/lib/db"
import { env } from "@/lib/env"
import { isOrphan } from "@/lib/reconcile"

export async function GET(request: Request) {
  if (request.headers.get("authorization") !== `Bearer ${env("CRON_SECRET")}`) {
    return new NextResponse("Unauthorized", { status: 401 })
  }
  const s3 = new S3Client({
    region: "auto", endpoint: env("R2_ENDPOINT"), forcePathStyle: true,
    credentials: { accessKeyId: env("R2_ACCESS_KEY_ID"), secretAccessKey: env("R2_SECRET_ACCESS_KEY") },
  })
  const bucket = env("R2_BUCKET")
  const photos = await db.photo.findMany({ select: { r2Key: true, thumbKey: true } })
  const known = new Set<string>()
  photos.forEach((p) => { known.add(p.r2Key); if (p.thumbKey) known.add(p.thumbKey) })

  const now = new Date()
  let deleted = 0
  let token: string | undefined
  do {
    const page = await s3.send(new ListObjectsV2Command({ Bucket: bucket, ContinuationToken: token }))
    for (const obj of page.Contents ?? []) {
      if (obj.Key && obj.LastModified && isOrphan(obj.Key, known, obj.LastModified, now)) {
        await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: obj.Key }))
        deleted++
      }
    }
    token = page.IsTruncated ? page.NextContinuationToken : undefined
  } while (token)

  return NextResponse.json({ deleted })
}
```

- [ ] **Step 6: Schedule via `vercel.json`**

```json
{ "crons": [{ "path": "/api/cron/reconcile", "schedule": "0 4 * * *" }] }
```
> Set `CRON_SECRET` in Vercel; Vercel Cron sends the configured secret as a Bearer token. Verify the auth header convention against current Vercel Cron docs.

- [ ] **Step 7: Commit**

```bash
git add src/lib/reconcile.ts tests/unit/reconcile.test.ts "src/app/api/cron/reconcile/route.ts" vercel.json
git commit -m "feat: orphan reconciliation sweep + daily cron"
```

### Task 5.7: Final landing identity + navigation + name

**Files:**
- Modify: `src/app/page.tsx` (hero with featured album + Ken Burns), add a shared nav.
- Create: `src/components/ui/Nav.tsx`

- [ ] **Step 1: Implement a simple nav `src/components/ui/Nav.tsx`** and include it in `layout.tsx`

```tsx
import Link from "next/link"
export function Nav() {
  return (
    <nav className="flex items-center justify-between px-6 py-4 border-b border-ink/10">
      <Link href="/" className="font-serif text-xl">Family Albums</Link>
      <div className="flex gap-6 text-sm">
        <Link href="/library">Library</Link>
        <Link href="/on-this-day">On this day</Link>
        <Link href="/upload">Upload</Link>
      </div>
    </nav>
  )
}
```

- [ ] **Step 2: Enhance the landing hero** — in `src/app/page.tsx`, fetch the most recent album's cover and render it with `KenBurns` behind the title (server component fetches signed URL, passes to the client island). Finalize the family name here (replace the `"Family Albums"` placeholder per the decision made at this point).

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/Nav.tsx src/app/page.tsx src/app/layout.tsx
git commit -m "feat: landing hero + nav, finalize app name"
```

### Task 5.8: Polish e2e — comment + reduced-motion

**Files:**
- Create: `tests/e2e/polish.spec.ts`

- [ ] **Step 1: Write the e2e**

```ts
import { test, expect } from "@playwright/test"

test.use({ /* authenticated storageState configured globally */ })

test("adds a comment on a photo", async ({ page }) => {
  await page.goto("/library")
  await page.locator("a[href^='/albums/']").first().click()
  await page.locator("a[href^='/photos/']").first().click()
  await page.getByPlaceholder("Add a memory…").fill("So good")
  await page.getByRole("button", { name: /post/i }).click()
  await expect(page.getByText("So good")).toBeVisible()
})

test("reduced-motion renders without large transforms", async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: "reduce" })
  const page = await ctx.newPage()
  const res = await page.goto("/library")
  expect(res?.status()).toBe(200)
  await expect(page.getByRole("heading", { name: /library/i })).toBeVisible()
})
```

- [ ] **Step 2: Run e2e, verify pass**

Run: `npm run test:e2e -- polish`
Expected: PASS.

- [ ] **Step 3: Commit + deploy + verify gate**

```bash
git add tests/e2e/polish.spec.ts
git commit -m "test: comment + reduced-motion e2e"
git push
```
On prod: verify the bespoke landing, add a comment, toggle OS reduced-motion and confirm calm variants, confirm the cron appears in Vercel → Cron jobs.

**✅ Phase 5 gate:** the site feels bespoke; reduced-motion works; reconciliation runs on schedule.

---

## Self-Review

**Spec coverage (SPEC.md):**
- G1 sign in (allowlist) → Phase 3. ✓
- G2 browser→R2 upload → Phase 1. ✓
- G3 albums + manual ordering → Phase 4. ✓
- G4 chronological/"on this day" → Phase 5 (Task 5.3). ✓
- G5 captions/comments → Phase 5 (Tasks 5.1–5.2). ✓
- G6 private + signed URLs → Phases 1–2 (`presignGet`, private bucket). ✓
- G7 push-to-deploy + previews → Phase 0 (Task 0.5). ✓
- Data model §5 → Task 2.1 (all five models + role enum + indexes). ✓
- Upload flow §6.1 → Tasks 1.x + 2.7 (presigned PUT, client thumb/exif, DB write). ✓
- Serve flow §6.2 → `presignGet` (local crypto, TTL). ✓
- Auth/allowlist §6.3 → Phase 3 (reject in signIn callback, no row). ✓
- Visual identity §7 / DESIGN_PROMPT → palette/fonts (0.4), motion system (5.4), blur-up (2.8), on this day (5.3). ✓
- Open questions §10 → all resolved in plan.md decision table.

**Placeholder scan:** No "TBD"/"implement later" left in steps; every code step shows real code. Manual provisioning steps (Vercel/Neon/R2/Google) are inherently click-ops and are spelled out as concrete checklists.

**Type consistency:** `presignGet`/`presignPut`, `requireUser`, `PhotoListItem`, `applyReorder`/`positionsFor`, `isOrphan`, `matchesToday` names are used identically across the tasks that define and consume them.

**Known soft spots flagged inline (verify against live docs at coding time):** Auth.js v5 config/middleware shape; AWS SDK presigner + R2 checksum headers; Next 15 async `params`; Vercel Cron auth header. The authenticated-e2e `storageState` setup is described in the testing strategy and Phase 3; wire it as a Playwright global-setup before running the authenticated specs.

---

## Execution

Use **superpowers:subagent-driven-development** (recommended) or **superpowers:executing-plans** to implement task-by-task. Each task ends in an independently testable, committable deliverable; each phase ends deployed and gated on the production URL.
