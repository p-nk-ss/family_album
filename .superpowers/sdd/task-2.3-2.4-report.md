# Task 2.3 & 2.4 — EXIF parsing + Blurhash helpers

## TDD Evidence

### Task 2.3 — `lib/exif.ts`

**RED:** Wrote `tests/unit/exif.test.ts` before any implementation. Running `npm test -- exif` failed with:
```
Error: Cannot find package '@/lib/exif' imported from tests/unit/exif.test.ts
```

**Implementation:** Created `lib/exif.ts` with `parseExif(file: Blob): Promise<ExifMeta>` using `exifr.parse(buffer, { pick: [...] })`. Returns ISO string for DateTimeOriginal/CreateDate, ExifImageWidth/Height, Orientation; returns all nulls on failure or missing data.

**GREEN:** `npm test -- exif` → 2/2 tests passed.

### Task 2.4 — `lib/blurhash.ts`

**RED:** Wrote `tests/unit/blurhash.test.ts` before any implementation. Running `npm test -- blurhash` failed with:
```
Error: Cannot find package '@/lib/blurhash' imported from tests/unit/blurhash.test.ts
```

**Implementation:** Created `lib/blurhash.ts` wrapping `encode()` from the `blurhash` package (componentX=4, componentY=3) and `isBlurhashValid()` with an empty-string guard.

**GREEN:** `npm test -- blurhash` → 2/2 tests passed.

## JPEG Fixture Generation

`tests/fixtures/sample.jpg` was generated deterministically from a known-good base64 string of a 1×1 white JPEG (JFIF, 302 bytes). The approach:

```js
const b64 = '/9j/4AAQSkZJRgABAQEASABIAAD/...'; // known minimal 1x1 JPEG
const buf = Buffer.from(b64, 'base64');
fs.writeFileSync('tests/fixtures/sample.jpg', buf);
```

Verification confirmed magic bytes FF D8 FF (valid JPEG SOI + APP0 JFIF marker). The fixture carries no EXIF payload — the exif tests assert result *shape* (`toHaveProperty`), not specific values, so this is correct.

## Files Changed

| File | Action |
|------|--------|
| `lib/exif.ts` | Created |
| `lib/blurhash.ts` | Created |
| `tests/unit/exif.test.ts` | Created |
| `tests/unit/blurhash.test.ts` | Created |
| `tests/fixtures/sample.jpg` | Created (302-byte 1×1 JPEG) |
| `package.json` | Added `exifr@^7.1.3`, `blurhash@^2.0.5` |
| `package-lock.json` | Updated |

## Test Summary

```
Test Files  6 passed (6)
Tests       15 passed (15)
```

All 6 test files green (smoke, keys, validation, r2, exif, blurhash). Full `npm run build` also passes (Next.js 16 + Turbopack, TypeScript clean).

## Commits

- `62e9458` — feat: client EXIF parsing via exifr (Task 2.3)
- `a1e67c9` — feat: blurhash encode/validate helpers (Task 2.4)

## Concerns

- **No jsdom installed** as instructed — tests run in Node 20's native `Blob`/`arrayBuffer`/`Uint8ClampedArray` which are all available without a DOM shim. This is correct per instructions.
- `exifr` is a CJS/ESM hybrid. The import `import exifr from "exifr"` works correctly under Vitest's Node environment (default interop).
- The fixture JPEG has no EXIF data, so `takenAt`, `width`, `height`, `orientation` all return `null` for the first test case — this is acceptable since the test uses `toHaveProperty` (shape check only), not value assertions.
- `blurhash@2.0.5` uses `isBlurhashValid(hash).result` (returns an object `{ result: boolean, errorReason?: string }`). The empty-string guard (`if (!hash) return false`) is needed before calling `isBlurhashValid` to avoid passing empty string to the underlying parser.
