# Project Conventions — AUTHORITATIVE OVERRIDES

> Every implementer/reviewer subagent MUST read this. Where it conflicts with
> code shown in `implementation-plan.md`, **this file wins** — the plan was
> written before the actual Prisma 7 / repo layout was known. Apply these
> transforms to any plan code you transcribe.

## 1. Directory layout — NO `src/`
Code lives at the repo root, not under `src/`. Map every plan path:
- `src/lib/X`  → `lib/X`
- `src/app/X`  → `app/X`
- `src/components/X` → `components/X`
- `src/middleware.ts` → `middleware.ts` (repo root)
- `src/types/X` → `types/X`

`tsconfig.json` path alias is `@/*` → `./*` (NOT `./src/*`). So `@/lib/db`
resolves to `lib/db.ts`. create-next-app is run WITHOUT `--src-dir`.

## 2. Prisma client — already configured, do not recreate
- Import the client as: `import { prisma } from "@/lib/db"`.
  **NEVER** `import { db } ...` and **NEVER** `from "@prisma/client"`.
- In any plan code, rename `db.` → `prisma.` (e.g. `db.photo.create` → `prisma.photo.create`).
- `lib/db.ts`, `prisma/schema.prisma`, `prisma.config.ts`, and `generated/prisma`
  already exist and are correct. DO NOT modify or recreate them.
- This is **Prisma 7**: generated client at `generated/prisma/client`,
  mandatory `@prisma/adapter-pg`. After `npm install`, run `npx prisma generate`
  (`generated/` is git-ignored).
- Schema changes use `npx prisma migrate dev --name <x>`. The `init` migration
  is already applied. Env vars: `DATABASE_URL` (pooled, runtime) and
  `DATABASE_URL_UNPOOLED` (CLI). There is **no** `DIRECT_URL`.

## 3. The existing schema is fixed — adapt code to it
Field/relation names that DIFFER from the plan's assumptions:
- **User.name is REQUIRED** (non-null). Always pass a `name` when creating a
  user — fallback to the email local part or `"Member"`.
- **User.role has NO default.** Always pass `role` explicitly on create
  (`"member"` unless seeding the owner as `"admin"`).
- **Album:** scalar is `createdById` + relation `createdBy` (User). Create with
  `createdById: userId`; check ownership via `album.createdById === userId`.
  The photos-in-album relation is **`albumPhotos`** (NOT `photos`). Cover
  relation is `coverPhoto`. There is no `creator` relation.
- **Photo:** scalar `uploaderId` + relation `uploader`; album link relation
  `albumPhotos`; cover back-relation `coverFor`.
- **AlbumPhoto** compound key accessor in `where`: `albumId_photoId`.
- **Comment:** `authorId` + `author`, `photoId` + `photo`.
- IDs are UUIDv7 (`uuid(7)`), `@db.Uuid`. Timestamps `@db.Timestamptz`.

## 4. No `onDelete` cascades exist — handle deletes in app code
The schema deliberately keeps Prisma default referential actions (no cascade).
So:
- Deleting a **Photo**: in a `prisma.$transaction`, first delete its
  `albumPhoto` rows and `comment` rows, set any `Album.coverPhotoId` that
  references it to null, THEN delete the photo (and its R2 objects).
- Deleting an **Album**: delete its `albumPhoto` rows, then the album.
Do NOT add `@@index` or `onDelete` to the schema (owner chose minimalism); keep
performance-index work out of scope for v1.

## 5. Do not add `import "server-only"`
Modules under `lib/` are imported by Vitest (node env) integration tests.
`server-only` throws outside the RSC bundler and breaks tests. Omit it from
`lib/r2.ts`, `lib/dto.ts`, `lib/session.ts`, etc. (The plan shows it — drop it.)

## 6. Tailwind is whatever create-next-app installs (likely v4, CSS-first)
If Tailwind v4: there is no `tailwind.config.ts`. Define palette tokens in
`app/globals.css` inside an `@theme { … }` block, e.g.
`--color-paper: #F7F1E6; --color-ink: #2B2723; --color-terracotta: #C06A4B;`
so utility classes `bg-paper`, `text-ink`, `bg-terracotta` work. Adapt plan
Task 0.4 (which assumed v3 `tailwind.config.ts`) accordingly. If v3 was
installed, use the plan's `tailwind.config.ts` approach instead.

## 7. Tests load real env via dotenv
Vitest integration tests run against the real Neon `neondb` (currently empty;
`resetDb` truncates between tests — safe). Ensure env loads: integration setup
file does `import "dotenv/config"` before importing `@/lib/db`. Unit tests for
`lib/r2.ts` set fake R2 env inline and mock the AWS SDK (no network).

## 8. Deferred infrastructure
- **R2 live creds are currently malformed in `.env`** (flagged to user). Until
  fixed: r2 unit tests (mocked) and presign-route integration tests still pass
  (presigning is local crypto). Live e2e that PUTs to / GETs from R2 (plan Task
  2.8 gallery, real-bucket smoke) is PENDING — mark it skipped, don't fail the task on it.
- **Vercel deploy** (Task 0.5 dashboard step) and **Google OAuth provisioning**
  (Task 3.8) are deferred. Still create the CI workflow file and all code.
- Phase 3 auth code is written and unit-tested; the live Google sign-in flow
  and the auth-gate e2e are PENDING until creds exist. Set a dummy
  `AUTH_SECRET` locally so the app builds.
- Skip every "git push / deploy / verify on prod URL" step; do the local
  commit but not the push. (Verify gates locally instead.)

## 9. Git
Repo starts non-git. Task 0.1 runs `git init` then creates and switches to
branch `build/family-albums` before any further commits. All work commits there.
