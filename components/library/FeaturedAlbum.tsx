import Link from "next/link"
import { KenBurns } from "@/components/motion/KenBurns"
import { Parallax } from "@/components/motion/Parallax"

export function FeaturedAlbum({
  id,
  title,
  author,
  photoCount,
  coverFullUrl,
  dateRange,
}: {
  id: string
  title: string
  author?: string | null
  photoCount: number
  coverFullUrl: string | null
  dateRange: { from: string; to: string } | null
}) {
  const range = formatRange(dateRange)
  const meta = [
    `${photoCount} ${photoCount === 1 ? "photo" : "photos"}`,
    range,
    author ? `by ${author}` : null,
  ]
    .filter(Boolean)
    .join("  ·  ")

  return (
    <Link
      href={`/albums/${id}`}
      className="group relative block overflow-hidden rounded-2xl"
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-paper-200 sm:aspect-[16/7]">
        {coverFullUrl ? (
          // inflated so the parallax travel never reveals an edge
          <Parallax distance={50} className="absolute -inset-y-12 inset-x-0">
            <KenBurns src={coverFullUrl} alt="" />
          </Parallax>
        ) : (
          <div className="h-full w-full bg-paper-200" />
        )}
        {/* legibility scrim — deepens slightly on hover */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent transition-opacity duration-500 group-hover:from-black/85" />
      </div>
      <div className="absolute inset-x-0 bottom-0 p-6 sm:p-10">
        <p className="eyebrow mb-3">Featured album</p>
        <h2 className="max-w-2xl font-serif text-4xl font-light leading-[1.05] text-white sm:text-6xl">
          {title}
        </h2>
        <p className="mt-3 text-sm text-white/70">{meta}</p>
      </div>
    </Link>
  )
}

function formatRange(dateRange: { from: string; to: string } | null): string | null {
  if (!dateRange) return null
  const from = new Date(dateRange.from).getFullYear()
  const to = new Date(dateRange.to).getFullYear()
  return from === to ? String(from) : `${from}–${to}`
}
