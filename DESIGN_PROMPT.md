# Claude Design prompt — Family Photo Library

> Paste this into Claude Design as the opening brief. It pairs with `SPEC.md`.
> Iterate screen by screen after the first pass.

---

## Brief

Design a private, invite-only **family photo library** — a web app for one family
to keep and relive their photos. This is **not** a SaaS product and **not** a
clone of Google Photos. It should feel like a *home*: warm, personal, crafted,
and quietly luxurious. It is for personal use only, so we can go lavish —
"expensive" in the sense of *considered*, not loud.

The organizing principle is **albums as stories**, not a flat date dump. An album
has a title, a written description, a cover, and a hand-curated order of photos.
The chronological view is secondary.

This is also a portfolio piece, so visual and interaction craft matter as much as
function.

## The feeling

Think a beautifully printed family photo book crossed with a high-end editorial
site. Cinematic, tactile, unhurried. Generous whitespace, real typographic
hierarchy, soft depth. Every transition should feel *intentional and physical* —
like turning a heavy page, not flipping a tab. Restraint reads as expensive;
clutter and default easing read as cheap.

## Screens to design (first pass)

1. **Landing / home** — the "front door." Sets the tone the moment you arrive.
   A hero with the family name/mark and a recent or featured album. Should feel
   like home, not a dashboard.
2. **Library** — the collection of albums. Each album as a rich card with cover,
   title, date range, photo count. This is the heart of the app.
3. **Album (story view)** — opens an album: title, description (the story), and
   the curated photo sequence. The reading/scrolling experience here is the
   centerpiece.
4. **Photo detail / lightbox** — a single photo full-bleed, with caption and
   family comments. Navigation between photos.
5. **Upload flow** — selecting and uploading photos; should feel light and
   satisfying, with clear progress.
6. **"On this day"** — a cinematic strip/timeline of photos taken on this date in
   past years.

Design mobile and desktop layouts. Relatives will mostly view on phones.

## Visual language

- **Palette:** warm and timeless, not a cold dev-tool dark theme. Suggested
  directions to explore (pick one and commit): (a) warm off-white / cream paper
  with deep ink text and a single muted accent (terracotta, sage, or dusty
  blue); (b) a rich low-contrast dark mode — warm charcoal, not pure black —
  for an "evening, photos glowing" mood. Offer both light and dark if feasible.
- **Typography:** a real type pairing — an expressive serif or display face for
  titles (the editorial, "family book" voice) and a clean humanist sans for UI
  and body. Large, confident headings. Let titles breathe.
- **Depth & material:** soft, layered shadows; subtle grain or paper texture is
  welcome; rounded but not bubbly corners. Photos are the stars — frame them
  generously and let the chrome recede.
- **Layout:** editorial grids, not uniform tiles. A masonry/justified gallery
  that respects each photo's aspect ratio. Asymmetry is good.

## Motion language (the priority — make it lavish but coherent)

Use **one consistent motion system**: spring-based physics (think Framer Motion
springs), a small set of shared easings, and consistent durations. Everything
below should feel like the same physical world.

- **Page / view transitions:** shared-element transitions are the signature
  move. A photo thumbnail in the grid should *expand smoothly into* the full
  detail view (and shrink back) — the same image morphing position and size, not
  a cut. Use the View Transitions API / shared layout animation.
- **Library entrance:** album cards reveal with a **staggered** fade + rise on
  load. Not all at once — a cascade.
- **Album covers:** slow, subtle **Ken Burns** drift (gentle zoom/pan) on the
  hero cover. Optional light **parallax** as you scroll into a story.
- **Story scroll:** as you scroll through an album, photos and captions
  **reveal on scroll** (fade + slight rise), pacing the story like a film.
- **Image loading:** **blur-up** — a tiny blurred placeholder (blurhash) that
  sharpens into the real image. No hard pop-in, no layout shift.
- **Hover / press (desktop + touch):** photos lift slightly with a softening
  shadow on hover; buttons and cards have springy, tactile press states.
- **Lightbox:** opens with a scale + fade from the clicked thumbnail; swiping /
  arrowing between photos slides with momentum; backdrop blurs the gallery
  behind.
- **Micro-interactions:** satisfying small animations on adding a comment,
  setting a cover, finishing an upload (e.g. a gentle confirming motion). Upload
  progress should feel alive.
- **"On this day":** a slow cinematic horizontal pan through the years.

**Craft rules (important):**
- Quality of easing > quantity of effects. Tune the springs; avoid linear/default ease.
- Keep durations consistent and snappy enough not to feel sluggish (most UI
  transitions ~200–400ms; cinematic moments can be longer).
- **Respect `prefers-reduced-motion`:** provide a calm, reduced variant of every
  animation (cross-fades instead of large movement). This is non-negotiable —
  some family members may be motion-sensitive.
- Never let motion block content or make the app feel slow to *use*.

## Technical context (so designs are buildable)

- Built in **Next.js (App Router)** + **Tailwind CSS**, deployed on Vercel.
- Animations will be implemented with **Framer Motion** and the **View
  Transitions API**; design with those capabilities in mind (shared layout
  transitions, spring config, scroll-linked animation).
- Responsive web only (no native app). Phone-first, scales up to desktop.
- Images are served via short-lived signed URLs; design for a blurhash
  placeholder → full image loading pattern.

## Avoid

- Generic SaaS / dashboard aesthetics; default Bootstrap/Material vibes.
- Uniform fixed-size square tiles that crop every photo.
- Cold pure-black dark mode or pure-white clinical light mode.
- Decorative animation with default easing — that's what makes it feel cheap.
- Clutter and dense chrome competing with the photos.

## Deliverables

Start with the **Library** and **Album (story) view** — they define the product.
Then **Photo detail/lightbox** and **Landing**. Show light and dark directions
for the palette. Annotate the key motion moments (what animates, how, and the
reduced-motion fallback).
