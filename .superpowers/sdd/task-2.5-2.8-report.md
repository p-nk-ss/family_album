# Task 2.5 / 2.7 / 2.8 Implementation Report

## What was built

### Task 2.5 — `lib/image-client.ts`
Browser-only canvas utilities marked `"use client"`.
- `makeThumbnail(file, maxEdge=600)`: scales the image to fit within `maxEdge` using `createImageBitmap(..., { imageOrientation: "from-image" })` to honour EXIF rotation, draws onto a canvas, and exports JPEG at quality 0.8. Returns `{ blob, width, height }`.
- `smallPixels(file, size=32)`: same bitmap load path, but scales to 32×32 max and reads back raw RGBA pixel data via `getImageData`. Returns `{ pixels, width, height }` for blurhash encoding.
No unit test (browser Canvas API unavailable in Node/Vitest). Exercised by the gallery e2e (when R2 creds are available).

### Task 2.7 — `components/upload/Uploader.tsx`
Full upload flow. On submit:
1. Runs `makeThumbnail`, `smallPixels`, `parseExif` in parallel.
2. Encodes `blurhash` from small pixels.
3. POSTs `/api/upload-url` to get presigned URLs + keys.
4. PUTs original and thumbnail to R2 in parallel.
5. POSTs `/api/photos` with `{ r2Key, thumbKey, contentType, sizeBytes, width, height, takenAt, blurhash }`.
Shows `data-testid="upload-done"` with "Saved ✓" on success, error text on failure. Button disabled while busy.

### Task 2.8 — Gallery

**`components/motion/BlurUpImage.tsx`** (client island):
- Decodes the blurhash to a 32×32 `<canvas>` placeholder via `decode()` from the `blurhash` package.
- Renders a lazy `<img>` that fades in (`opacity-0 → opacity-100`) on load.
- When loaded, the canvas fades out (`opacity-100 → opacity-0`).
- React imports consolidated into a single line: `import { useState, useEffect, useRef } from "react"`.

**`app/upload/page.tsx`**: Server component wrapping `<Uploader />` under a serif heading.

**`app/library/page.tsx`**: Server component with `export const dynamic = "force-dynamic"` to prevent build-time DB calls. Queries `prisma.photo.findMany({ orderBy: [{ takenAt: "desc" }, { uploadedAt: "desc" }], take: 200 })`, signs URLs via `signPhotoList`, renders a masonry grid (`columns-2 md:columns-3 lg:columns-4`) of `<BlurUpImage>` in a `data-testid="photo-grid"` container.

### `tests/e2e/gallery.spec.ts` — written but skipped
The upload→gallery e2e is skipped with `test.skip(...)` because the R2 credentials in `.env` are currently malformed (`R2_*` env vars). The test would require a live PUT to R2 which would fail. Comment: "pending valid R2 credentials in .env (R2_* malformed); unskip once fixed".

## Why the gallery e2e is skipped
R2 credentials in `.env` are malformed (confirmed in `.superpowers/conventions.md` §8). The gallery spec performs a real browser PUT to R2 followed by a signed GET on `/library`. Until valid credentials are supplied, the PUT would return an error and the test would fail. The spec is already authored and will work once `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, and `R2_ENDPOINT` are set correctly.

## Build / test output summary

```
npm run build  → ✓ Compiled successfully (Next.js 16.2.9 Turbopack)
                  /library: ƒ (Dynamic, force-dynamic)
                  /upload:  ○ (Static)

npm test       → 6 test files, 15 tests passed

npm run test:int → 2 test files, 4 tests passed (real Neon DB)

npm run test:e2e → 1 passed (landing), 1 skipped (gallery)
```

## Files created / changed

| File | Action |
|------|--------|
| `lib/image-client.ts` | Created |
| `components/upload/Uploader.tsx` | Created |
| `components/motion/BlurUpImage.tsx` | Created |
| `app/upload/page.tsx` | Created |
| `app/library/page.tsx` | Created |
| `tests/e2e/gallery.spec.ts` | Created (skipped) |
| `.superpowers/sdd/task-2.5-2.8-report.md` | Created (this file) |

## Concerns

1. **`"use client"` on `lib/image-client.ts`**: The `"use client"` directive in a lib module (as opposed to a component) is unusual. Next.js will not error on it, but it means the module cannot be imported by any server component. This is intentional — canvas APIs are browser-only — but it requires `Uploader.tsx` to always be a client component, which it already is.

2. **`width` / `height` props on `BlurUpImage` are nullable**: The current rendering doesn't use `width`/`height` to set explicit dimensions on `<img>` (relying on CSS `w-full` instead). This avoids layout shift concerns from wrong dimensions, but means the browser can't reserve space before the image loads. In Phase 5 these can be wired to `width`/`height` attributes with a proper aspect-ratio container.

3. **Phase 2 `uploaderId`**: The photos route still uses `phase2UploaderId()` (upserts an `anon@local` user). This is correct for Phase 2 but will be replaced by session attribution in Phase 3.

4. **No `width`/`height` on `<img>`**: The `/* eslint-disable-next-line @next/next/no-img-element */` comment suppresses the Next.js lint rule about using `<Image>` instead of `<img>`. Using `<img>` here is correct because the src is a presigned R2 URL at runtime, not a static asset — Next.js Image optimisation would proxy through `/_next/image` which would expose the signed URL pattern unnecessarily.
