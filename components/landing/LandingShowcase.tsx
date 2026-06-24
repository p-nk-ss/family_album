"use client"

import Link from "next/link"
import { Reveal } from "@/components/motion/Reveal"
import { Parallax } from "@/components/motion/Parallax"
import { KenBurns } from "@/components/motion/KenBurns"

export type ShowcaseStats = {
  albums: number
  photos: number
  sinceYear: number
}

export type ShowcaseTeaser = {
  id: string
  title: string
  author: string | null
  photoCount: number
  coverFullUrl: string | null
  dateRange: { from: string; to: string } | null
}

/**
 * Scroll act 2 — the editorial reveal below the hero fold: a single tabular-nums
 * stat line and the latest-album teaser, which drifts on scroll (parallax) and
 * links into its story.
 */
export function LandingShowcase({
  stats,
  teaser,
}: {
  stats: ShowcaseStats
  teaser: ShowcaseTeaser | null
}) {
  return (
    <section className="mx-auto max-w-5xl px-6 py-28 sm:py-40">
      <Reveal>
        <p className="eyebrow mb-5">the collection so far</p>
        <p className="font-serif text-3xl font-light leading-snug text-ink/70 sm:text-4xl">
          <Stat n={stats.albums} word={stats.albums === 1 ? "album" : "albums"} />{" "}
          <Dot />{" "}
          <Stat n={stats.photos} word={stats.photos === 1 ? "photo" : "photos"} />{" "}
          <Dot /> since{" "}
          <span className="tabular-nums text-ink">{stats.sinceYear}</span>
        </p>
      </Reveal>

      {teaser ? (
        <Reveal delay={0.05} className="mt-16">
          <Link href={`/albums/${teaser.id}`} className="group block">
            <p className="eyebrow mb-4">latest album</p>
            <div className="relative aspect-[16/9] overflow-hidden rounded-2xl bg-paper-200">
              {teaser.coverFullUrl && (
                <Parallax distance={40} className="absolute -inset-y-12 inset-x-0">
                  <KenBurns src={teaser.coverFullUrl} alt="" />
                </Parallax>
              )}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent transition-opacity duration-500 group-hover:from-black/85" />
              <div className="absolute inset-x-0 bottom-0 p-6 sm:p-10">
                <h2 className="max-w-2xl font-serif text-4xl font-light leading-[1.05] text-white sm:text-6xl">
                  {teaser.title}
                </h2>
                <p className="mt-3 text-sm text-white/70">{teaserMeta(teaser)}</p>
              </div>
            </div>
          </Link>
        </Reveal>
      ) : (
        <Reveal delay={0.05} className="mt-16 text-center">
          <p className="mx-auto max-w-sm text-ink/55">
            No albums yet — an album is a story, a title, a cover, and photos in
            the order you choose.
          </p>
          <Link
            href="/albums/new"
            className="mt-7 inline-block rounded-full bg-terracotta px-6 py-2.5 font-medium text-paper transition-transform duration-200 ease-out active:scale-[0.97]"
          >
            Create the first album
          </Link>
        </Reveal>
      )}
    </section>
  )
}

function Stat({ n, word }: { n: number; word: string }) {
  return (
    <span>
      <span className="tabular-nums text-ink">{n}</span> {word}
    </span>
  )
}

function Dot() {
  return <span className="text-ink/55">·</span>
}

function teaserMeta(t: ShowcaseTeaser): string {
  return [
    `${t.photoCount} ${t.photoCount === 1 ? "photo" : "photos"}`,
    formatRange(t.dateRange),
    t.author ? `by ${t.author}` : null,
  ]
    .filter(Boolean)
    .join("  ·  ")
}

function formatRange(dateRange: { from: string; to: string } | null): string | null {
  if (!dateRange) return null
  const from = new Date(dateRange.from).getFullYear()
  const to = new Date(dateRange.to).getFullYear()
  return from === to ? String(from) : `${from}–${to}`
}
