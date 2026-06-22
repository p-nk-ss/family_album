# Family Albums — Implementation Plan

## Context

`family_albums` is a private, invite-only **family photo library** built as a learning + portfolio project. It deliberately does **not** chase Google Photos features (no face recognition, AI search, unlimited storage). The differentiator is **albums-as-stories** (curated title/description/cover/manual order), a **family voice** (captions + comments), and a **bespoke warm visual identity** with lavish, coherent motion.

The source of truth is `SPEC.md` (vision, data model, key flows, phased plan) and `DESIGN_PROMPT.md` (visual + motion language). This plan turns those into an executable, TDD-driven build across all 6 phases, each ending in a **deployed** state. The repo is currently bare (only `framer-motion@12.40.0`, not yet a git repo, no Next.js).

### Binding decisions (resolved with the user)

| Decision | Choice |
|---|---|
| Plan scope | All 6 phases, in detail |
| ORM | **Prisma** (Neon Postgres, metadata only) |
| Auth | **Google-only** for v1 (Auth.js + email allowlist); magic-link deferred |
| Palette | **Warm light** cream-paper, single accent = **terracotta** (dark deferred) |
| App name | Placeholder ("Family Albums") — finalize before Phase 5 |
| Permissions | **Flat behavior now** (all members equal; delete limited to creator/uploader) + `role` enum column shipped & owner seeded as `admin` so role-gating needs no later migration |
| Testing | **Full TDD** — Vitest (unit/integration) + Playwright (e2e), test-first |
| Infra | No accounts yet → plan includes **full provisioning steps** (Vercel, Neon, R2, Google OAuth) |
| Thumbnails + blurhash | **Client-side canvas**; thumb = separate R2 object, blurhash = DB string |
| EXIF / capture date | **Client-side** via `exifr` (taken_at, dimensions, orientation) → POST as metadata |
| Orphaned objects | Documented now; reconciliation **sweep built in Phase 5** |

### Live-doc verification (APIs move fast — confirm before coding)

1. **Auth.js v5** (`next-auth@5` beta) — App-Router-native; hard break from v4 (`auth.ts` exports `handlers/auth/signIn/signOut`; `auth()` replaces `getServerSession`). Pin exact version; read v5 upgrade guide.
2. **`@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner`** against R2 — confirm `getSignedUrl` signature, `forcePathStyle: true`, endpoint form `https://<accountid>.r2.cloudflarestorage.com`. **Footgun:** recent SDK majors auto-add `x-amz-checksum-*` headers that R2 rejects on presigned PUT — verify and strip if needed.
3. **Prisma + Neon** — pooled `DATABASE_URL` (runtime) vs direct `DIRECT_URL` (migrations); consider `@prisma/adapter-neon` for serverless pooling.
4. **Next.js App Router** — confirm route-handler Web-API signature and `next.config` fields.

---

## Architecture

### Scaffolding into the existing non-empty directory

`create-next-app` won't run cleanly here and may clobber `package.json`. **Scaffold in a temp dir, then merge** (preserves `framer-motion`, lockfile, `SPEC.md`, `DESIGN_PROMPT.md`, `CLAUDE.md`, `graphify-out/`, `.claude/`):

1. `npx create-next-app@latest fa-tmp --typescript --app --tailwind --eslint --use-npm --src-dir --import-alias "@/*"` in a sibling dir.
2. Copy generated files into the project **except** `package.json`, `package-lock.json`, `node_modules`, `.gitignore`.
3. Merge generated deps into existing `package.json` (keep `framer-motion@^12.40.0`; pin React 19 / Next 15 to satisfy framer-motion peer range).
4. `npm install` → single merged lockfile.
5. Add `.gitignore` (`.env*`, `node_modules`, `.next`, `playwright-report`, `test-results`).
6. `git init` (Phase 0 initializes the repo).

`--use-npm` confirmed (lockfile is v3). Do **not** run `create-next-app .` in place.

### Folder structure (key boundaries)

```
src/
  app/
    layout.tsx               # fonts, paper bg, ReducedMotionProvider, session provider
    page.tsx                 # Landing / "front door"
    globals.css              # Tailwind + paper texture + palette CSS vars
    (auth)/signin/page.tsx   # branded Google sign-in
    library/page.tsx         # album grid (the heart) — server component
    albums/[id]/page.tsx     # story view;  albums/[id]/edit  (DnD client island);  albums/new
    photos/[id]/page.tsx     # photo detail (deep-link fallback for lightbox)
    on-this-day/page.tsx
    upload/page.tsx          # client island
    api/
      auth/[...nextauth]/route.ts
      upload-url/route.ts          # POST presigned PUT issuance
      photos/route.ts              # POST create row, GET list (signed thumbs)
      photos/[id]/route.ts         # GET signed original, DELETE (creator only)
      photos/[id]/comments/route.ts
      albums/route.ts ; albums/[id]/route.ts ; albums/[id]/photos/route.ts
      cron/reconcile/route.ts      # Phase 5 orphan sweep
  lib/                       # framework-agnostic, pure where possible (unit-testable)
    db.ts r2.ts keys.ts validation.ts auth.ts auth-allowlist.ts
    session.ts exif.ts blurhash.ts reorder.ts
  components/
    motion/                  # ALL "use client" framer-motion islands (per CLAUDE.md)
    library/ album/ upload/ ui/
prisma/  schema.prisma  seed.ts  migrations/
tests/   unit/  integration/  e2e/
vitest.config.ts  playwright.config.ts
```

**Boundaries:** `lib/*` holds pure, testable logic; route handlers/server components are thin (`requireUser()` → zod validate → delegate to `lib/`). All framer-motion lives in `components/motion/*` with `"use client"`; server components import these islands without carrying the directive.

### Data model (Prisma — matches SPEC §5)

Models: `User` (with `Role { admin member }` enum, default `member`), `Photo`, `Album`, `AlbumPhoto` (composite PK `[albumId, photoId]`, `position` int, `@@index([albumId, position])`), `Comment`. uuid PKs; snake_case `@map` to match SPEC columns; indexes on FKs + `Photo.takenAt` (chronological/"on this day"). `Album.coverPhotoId` is **set-null on photo delete** (not cascade — removing a cover photo must not delete the album). `AlbumPhoto`/`Comment` cascade on parent delete.

**Migrations:** Neon pooled→`DATABASE_URL`, direct→`DIRECT_URL`. Dev: `prisma migrate dev`. Prod: `prisma generate && prisma migrate deploy && next build` in Vercel build command. Neon **branch per environment** (prod + preview). `prisma/seed.ts` upserts owner `{ email: OWNER_EMAIL, role: admin }`.

### Presigned upload/serve (`lib/r2.ts`, `lib/keys.ts`)

- `photoKey(userId)` → `photos/${userId}/${uuid}.${ext}`; `thumbKey(...)` → `thumbs/...` (pure, unit-tested).
- `s3()` — memoized `S3Client`, `region:"auto"`, R2 endpoint, `forcePathStyle:true`, **server-only**.
- `presignPut({key, contentType, contentLength})` — server validates `contentType ∈ {jpeg,png,webp,avif,heic?}` and `size ≤ MAX_BYTES` **before** signing; short TTL (~5 min). Browser PUT headers must exactly match signed headers (watch checksum footgun).
- `presignGet({key, expiresIn})` — TTL a few hours; **local crypto, no R2 call** → cheap to sign many per render.

### API surface

Route handlers for storage-coupled/security endpoints (`/api/upload-url`, `/api/photos`, deletes) — clean REST contract, easy to integration-test. Server actions for in-page album/comment mutations (progressive enhancement, auto-revalidation). Both call the same `lib/` functions, so tests target `lib/`. Reorder = `PATCH /api/albums/[id]/photos { orderedPhotoIds }` → `lib/reorder.ts` recompute in a transaction. All handlers go through `requireUser()` (`lib/session.ts`): `auth()` → 401 if no session → confirm DB user row.

### Auth.js v5

`lib/auth.ts` exports `{ handlers, auth, signIn, signOut }`; route re-exports `handlers`. Google provider. **Allowlist enforced in `signIn` callback** — `isAllowlisted(profile.email)` (pure, `lib/auth-allowlist.ts`, reads comma-separated `ALLOWLIST_EMAILS`); returning `false` aborts before any row is created (SPEC §6.3). **Sessions: JWT, no adapter** (recommended) — keeps SPEC §5 schema verbatim, upsert our `users` row in the `jwt`/`signIn` callback and expose `session.user.id` + `role`. `session.user.id` is the authority for `uploaderId`/`createdBy`. Owner seeded as `admin` (inert in v1, future-proofs role-gating). Ensure `OWNER_EMAIL` ∈ `ALLOWLIST_EMAILS`.

---

## Phased build (each phase → DEPLOYED + checkpoint gate)

TDD throughout: failing test first, then implement.

### Phase 0 — Skeleton on prod
- **Tests first:** Vitest smoke import; Playwright `/` renders family mark + 200.
- **Tasks:** merge-scaffold Next.js → Tailwind palette tokens (cream/ink/terracotta) + font pairing in `globals.css`/`layout.tsx` → minimal landing → Vitest + Playwright configs + scripts → `git init` + GitHub repo → connect Vercel (push-to-deploy + PR previews).
- **Provision:** GitHub repo; Vercel project import.
- **Gate:** every push auto-deploys; prod URL serves landing; CI runs unit + e2e.

### Phase 1 — Vertical slice: upload to R2 (no auth, no DB)
- **Tests first:** unit `keys.ts`, `r2.presignPut` builder + validation (SDK mocked); e2e file picker → PUT → key shown (stubbed url).
- **Tasks:** `lib/{r2,keys,validation}.ts` → `POST /api/upload-url` (no auth) → `components/upload/Uploader.tsx` (picker → fetch url → `fetch(url,{method:"PUT",body:file})` → show key) → `/upload` page.
- **Provision:** Cloudflare R2 account + **private** bucket + API token; **bucket CORS** allowing `PUT`/`GET` from prod + preview + localhost; `R2_*` env vars in Vercel.
- **Gate:** a file chosen in the browser on **production** lands in R2; key displayed.

### Phase 2 — Database + gallery
- **Tests first:** unit photo-metadata zod parse; integration `POST /api/photos` writes row + `GET /api/photos` returns signed thumb URLs (test DB); e2e upload → photo appears in grid.
- **Tasks:** full Prisma schema → `lib/db.ts` singleton → first migration → `POST /api/photos` (write row after PUT) → `GET /api/photos` (sign thumb GETs) → `/library` grid with `BlurUpImage` → client canvas thumbnail + `exifr` metadata feeding `POST /api/photos`.
- **Provision:** Neon project + prod/preview branches; `DATABASE_URL`/`DIRECT_URL` in Vercel; add `prisma migrate deploy` to build command.
- **Gate:** uploaded photos persist and display as a gallery from prod across reloads.

### Phase 3 — Auth + allowlist
- **Tests first:** unit `isAllowlisted` edge cases; integration routes 401 without session + `signIn` rejects non-allowlisted; e2e unauth redirected, allowlisted reaches `/upload`.
- **Tasks:** `lib/auth.ts` (v5 Google + allowlist callback + JWT user upsert) → `app/api/auth/[...nextauth]/route.ts` → `lib/session.ts requireUser()` → gate upload/photos routes, set real `uploaderId` → branded `signin` page → `prisma/seed.ts` admin seed on prod.
- **Provision:** Google Cloud project + OAuth consent + Web client; **redirect URIs** for localhost + prod + preview (Google wildcard limited — add specific preview URLs or stable alias); env `AUTH_SECRET`, `GOOGLE_CLIENT_ID/SECRET`, `ALLOWLIST_EMAILS`, `OWNER_EMAIL`, `AUTH_URL`.
- **Gate:** only allowlisted users can sign in and upload; uploads attributed to real `uploader_id`.

### Phase 4 — Albums (core differentiator)
- **Tests first:** unit `lib/reorder.ts` (insert/move/remove, stable order); integration create/add/set-cover/reorder persists transactionally + delete-album authz (creator only); e2e member builds album end-to-end.
- **Tasks:** album route handlers + server actions → `/albums/new`, `/albums/[id]` story view, `/albums/[id]/edit` with framer-motion `Reorder` drag → cover selection → `/library` album cards (cover, title, date range, count).
- **Gate:** a member builds a curated album end-to-end on prod.

### Phase 5 — Family polish + orphan reconciliation
- **Tests first:** unit blurhash encode/decode, reconciliation predicate (no DB row AND older than N hours), "on this day" date grouping; integration comments CRUD + reconcile route (mocked R2 list/delete); e2e add comment + reduced-motion variant renders without large transforms.
- **Tasks:** comments/captions UI + endpoints → "on this day" view (`taken_at`) → real blurhash blur-up → full motion system: shared-element thumbnail→lightbox (View Transitions + framer-motion shared layout), staggered library reveal, Ken Burns covers, scroll reveals, springy hover/press — all gated by `prefers-reduced-motion` (`ReducedMotionProvider` + `useReducedMotion` → cross-fades) → `LazyMotion` for bundle size (per CLAUDE.md) → final landing visual identity → finalize app name → **orphan reconciliation** as `api/cron/reconcile` + Vercel Cron (delete R2 keys with no DB row older than N hours).
- **Provision:** Vercel Cron schedule + cron secret.
- **Gate:** site feels bespoke (not a template), reduced-motion works, reconciliation runs on schedule.

---

## Testing strategy

- **Unit (Vitest, no I/O):** `keys`, `r2` presign builders (SDK mocked via `aws-sdk-client-mock`), `validation`, `auth-allowlist`, `reorder`, `exif` (fixture bytes → metadata), `blurhash` (roundtrip).
- **Integration (Vitest vs real Postgres):** import route `POST`/`GET` functions, pass a `Request`, assert DB side-effects + DTOs. Use Neon preview branch or Testcontainers; `prisma migrate deploy` then truncate between tests. `auth()`/`requireUser()` stubbed to a fixed session; R2 mocked.
- **e2e (Playwright):** upload→gallery, sign-in gate, album build, reduced-motion. **Google:** seed a session cookie/JWT via test-only bypass (env-flagged) — never drive real consent. **R2:** one real smoke test against a dedicated test bucket (catches CORS/checksum regressions) + mocked PUT for the rest.
- **CI:** GitHub Actions running `vitest run` + `playwright test` on every PR; block merge on red.

---

## Key risks

| Risk | Handling |
|---|---|
| Orphaned R2 objects | Documented now; Phase 5 Vercel Cron sweep deletes keys with no DB row older than N hours |
| CORS on previews | Bucket CORS allows PUT/GET from prod + all preview origins + localhost; verify at Phase 1 gate |
| Presign TTL | PUT ~5 min; GET a few hours; env-configurable; re-signing GET per render is free |
| EXIF orientation | Read via `exifr`, bake rotation into canvas thumbnail, store normalized width/height |
| Large files / HEIC | Enforce `MAX_BYTES` server-side; decide HEIC accept-(convert)-or-reject in Phase 1 |
| SDK checksum headers break R2 PUT | Verify SDK version; strip `x-amz-checksum-*` if rejected; caught by real-bucket smoke e2e |
| Prisma serverless cold starts | Pooled runtime URL + direct migrations URL; `globalThis` client singleton; consider `@prisma/adapter-neon` |
| Auth.js v5 beta churn | Pin version; read upgrade guide; JWT-no-adapter reduces surface |
| Google preview redirect URIs | Wildcards limited — add specific preview URLs or stable alias |

---

## Critical files

- `prisma/schema.prisma` — data model + role enum + indexes
- `src/lib/r2.ts` — presign PUT/GET + key builders + validation
- `src/lib/auth.ts` + `src/lib/auth-allowlist.ts` — Auth.js v5 config + allowlist gate
- `src/app/api/upload-url/route.ts` + `src/app/api/photos/route.ts` — upload contract
- `src/lib/reorder.ts` — album ordering logic
- `src/components/motion/*` — motion system (shared-element, stagger, blur-up, reduced-motion)

## Verification (end-to-end)

- **Per phase:** the checkpoint gate above is the acceptance test, each confirmed **on the production URL** (no local-only accumulation).
- **Automated:** `npm run test` (Vitest unit+integration) and `npm run test:e2e` (Playwright) green in CI on every PR.
- **Final:** sign in as an allowlisted user → upload a photo (lands in R2, row in Neon, thumb + blurhash present) → build a curated album (add, reorder, set cover) → view the story → open lightbox via shared-element transition → add a comment → check "on this day" → toggle `prefers-reduced-motion` and confirm calm variants → confirm orphan reconciliation cron runs.
