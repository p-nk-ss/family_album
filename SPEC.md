# SPEC — Family Photo Library (working title)

> **Status:** Draft v0.1 — source of truth for the project.
> **Owner:** Pankaz
> **Last updated:** 2026-06-21

---

## 1. Purpose & vision

A private, invite-only photo library for one family. Functionally it overlaps
with Google Photos, but it is **not** trying to compete on algorithms (face
recognition, AI search, unlimited storage). The differentiator is deliberate:

- **Album/story-centric**, not a flat date dump. An album is a *curated story*
  (title, description, manual ordering, cover) — not an auto-generated pile.
- **Family voice** — captions and comments preserve oral history.
- **A distinct visual identity** — this is a *home*, not a generic app.

This is also a learning + portfolio project. Explicit secondary goals:

- Practice building and shipping with Claude Code.
- Practice release & configuration (CI/CD, environments, secrets).
- Produce a portfolio-worthy project that demonstrates auth, object storage,
  presigned URLs, and a clean deploy pipeline.

## 2. Goals

- G1. Family members (allowlisted) can sign in.
- G2. Members can upload photos directly to object storage (browser → R2).
- G3. Photos are organized primarily into **albums** (stories), with manual ordering.
- G4. A secondary chronological view exists, derived from photo capture date.
- G5. Photos and albums can have captions/comments.
- G6. Private by default — no public access to any image without an authorized,
  short-lived signed URL.
- G7. Deployed to production with push-to-deploy CI/CD and preview deploys per PR.

## 3. Non-goals (explicitly out of scope for v1)

- No face recognition, AI tagging, or semantic search.
- No native mobile apps (responsive web only).
- No public sharing / external share links (everything stays behind auth).
- No video in v1 (photos only; revisit later).
- No server-side image processing pipeline (thumbnails generated client-side).
- No real-time collaboration.

## 4. Tech stack

| Concern        | Choice                          | Notes |
|----------------|---------------------------------|-------|
| Framework      | Next.js (App Router)            | Frontend + backend (API routes / server actions) |
| Hosting / CI/CD| Vercel                          | Push-to-deploy, preview deploys, env per stage |
| Object storage | Cloudflare R2 (S3-compatible)   | Private bucket; free egress |
| Database       | Neon (Postgres, serverless)     | Metadata only, no image bytes |
| ORM            | Prisma (or Drizzle)             | Decide in Phase 0; Prisma slightly more resume-visible |
| Auth           | Auth.js (NextAuth)              | Google OAuth + allowlist; consider magic-link later |
| Storage SDK    | `@aws-sdk/client-s3` + presigner| For presigned PUT/GET against R2 |
| Styling        | TBD (Tailwind likely)           | Visual identity is a first-class concern |

> Versions/APIs of Next.js, Auth.js and the R2 SDK move fast — verify against
> current docs when writing code, especially Auth.js (breaking changes between
> majors).

## 5. Data model

Image bytes live in R2. The database stores only metadata + the R2 key.

### users
| field        | type        | notes |
|--------------|-------------|-------|
| id           | uuid PK     | |
| email        | text unique | matched against allowlist on first sign-in |
| name         | text        | |
| avatar_url   | text null   | |
| role         | enum        | `admin` \| `member` |
| created_at   | timestamptz | |

### photos
| field        | type        | notes |
|--------------|-------------|-------|
| id           | uuid PK     | |
| r2_key       | text unique | e.g. `photos/{userId}/{uuid}.jpg` |
| thumb_key    | text null   | client-generated thumbnail object |
| uploader_id  | uuid FK     | → users.id |
| caption      | text null   | |
| taken_at     | timestamptz null | from EXIF; falls back to uploaded_at |
| uploaded_at  | timestamptz | |
| width        | int null    | |
| height       | int null    | |
| size_bytes   | int null    | |
| content_type | text        | |
| blurhash     | text null   | tiny placeholder string (optional, cheap polish) |

### albums
| field          | type        | notes |
|----------------|-------------|-------|
| id             | uuid PK     | |
| title          | text        | |
| description    | text null   | the "story" |
| cover_photo_id | uuid FK null| → photos.id |
| created_by     | uuid FK     | → users.id |
| created_at     | timestamptz | |

### album_photos  (many-to-many + manual ordering)
| field     | type    | notes |
|-----------|---------|-------|
| album_id  | uuid FK | → albums.id |
| photo_id  | uuid FK | → photos.id |
| position  | int     | manual order within album |
| PK (album_id, photo_id) | | a photo may live in multiple albums |

### comments  (optional in v1, but core to "family voice")
| field     | type        | notes |
|-----------|-------------|-------|
| id        | uuid PK     | |
| photo_id  | uuid FK     | → photos.id |
| author_id | uuid FK     | → users.id |
| body      | text        | |
| created_at| timestamptz | |

## 6. Key flows

### 6.1 Upload (presigned PUT)
1. Client selects a file; generates a downscaled **thumbnail** client-side (canvas).
2. Client calls `POST /api/upload-url` → server checks session + allowlist,
   generates unique keys for original + thumb, returns **presigned PUT URLs**.
3. Browser uploads **directly to R2** via the presigned URLs. Server never
   touches the bytes (avoids function size/time limits and proxy cost).
4. On success, client calls `POST /api/photos` with keys + extracted metadata
   (EXIF `taken_at`, dimensions, size) → server writes the DB row.

**Known edge cases (track, don't necessarily solve in v1):**
- Orphaned objects: step 3 succeeds, step 4 fails (tab closed) → object in R2
  with no DB row. Mitigation later via bucket event notifications or a periodic
  reconciliation sweep.
- Requires **CORS on the bucket** allowing `PUT` from the app origin.
- Validate `content_type` and size server-side before issuing the URL.

### 6.2 Serve (presigned GET)
- Bucket is private; no public objects.
- When rendering a gallery/album, the server reads rows from DB and **signs
  short-lived GET URLs** for the needed objects (thumb in grids, original on
  detail view).
- Signing a presigned URL is a local crypto op with the access key; it does
  **not** call R2 and does **not** consume a Class B op. The Class B GetObject
  happens only when the browser actually fetches the image.
- URL TTL: a few hours, so an open tab doesn't go stale mid-session.

### 6.3 Auth + allowlist
- Sign in with Google via Auth.js.
- Allowlist of permitted emails. v1: a simple array in an env var. Later: an
  `invites`/allowlist table managed by an admin.
- Non-allowlisted users are rejected after OAuth (no account row created).
- **Open question:** Google login assumes everyone has a Google account
  (a barrier for older relatives). Consider adding magic-link (email) sign-in
  for friendliness. Decide before Phase 3.

## 7. Visual identity (first-class, not an afterthought)

This is where the project earns its "family" character. Cheap to build, high
impact:
- Albums presented as **stories** — title, description, cover, manual order.
- Captions + comments in family members' own words.
- A custom look: typography, palette, a family mark/logo, a landing page that
  feels like *home* rather than a SaaS dashboard.
- A "this day, over the years" strip driven by `taken_at`.

## 8. Phased plan (checkpoint-gated)

Each phase ends in a **deployed** state. Do not accumulate work locally.
`[ ]` = checkpoint gate to confirm before moving on.

### Phase 0 — Skeleton on prod
- `create-next-app`, repo, connect to Vercel, "hello world" live on the prod domain.
- Decide ORM (Prisma vs Drizzle).
- `[ ]` Gate: every push auto-deploys; prod URL works.

### Phase 1 — Vertical slice: upload to R2 (no auth, no DB)
- One page, file picker, presigned PUT upload directly to R2.
- Configure bucket CORS. Show the resulting key on screen.
- `[ ]` Gate: a file selected in the browser lands in R2 from production.

### Phase 2 — Database + gallery
- Connect Neon; create `photos`. Write a row after upload.
- Render a grid using presigned GET URLs (thumbs).
- `[ ]` Gate: uploaded photos persist and display as a gallery from prod.

### Phase 3 — Auth + allowlist
- Auth.js + Google. Allowlist via env var. Gate uploads behind a session.
- Link uploads to the real `uploader_id`.
- `[ ]` Gate: only allowlisted users can sign in and upload.

### Phase 4 — Albums (the core differentiator)
- `albums` + `album_photos`. Create album, add photos, set cover, manual reorder.
- Album detail view = the story view.
- `[ ]` Gate: a member can build a curated album end-to-end on prod.

### Phase 5 — Family polish
- Comments/captions, chronological "this day" view, thumbnails/blurhash,
  the custom visual identity, landing page.
- `[ ]` Gate: the site feels like *yours*, not a template.

## 9. Security & privacy notes
- Bucket private; access only via short-lived presigned URLs.
- Validate type/size before issuing upload URLs.
- Never put secrets client-side; R2 keys live only in server env.
- Unauthorized requests to R2 (401) are not billed.
- Personal/family data: keep it out of URLs/query strings where avoidable.

## 10. Open questions / decisions to make
- [ ] ORM: Prisma or Drizzle?
- [ ] Auth: Google-only, or add magic-link for non-technical relatives?
- [ ] Thumbnails: client-side canvas (chosen for v1) vs Cloudflare Images later?
- [ ] Project / family name + visual direction.
- [ ] Admin model: who can invite, delete others' photos, manage albums?
- [ ] Orphaned-object cleanup strategy (defer, but pick an approach).
