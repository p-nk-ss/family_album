import Link from "next/link"

export function AlbumCard({
  id,
  title,
  author,
  coverUrl,
  coverW,
  coverH,
  photoCount,
  dateRange,
}: {
  id: string
  title: string
  author?: string | null
  coverUrl: string | null
  coverW?: number | null
  coverH?: number | null
  photoCount: number
  dateRange: { from: string; to: string } | null
}) {
  const ratio = coverW && coverH ? coverW / coverH : 4 / 3
  const range = formatRange(dateRange)

  return (
    <Link href={`/albums/${id}`} className="group block">
      <div
        className="overflow-hidden rounded-xl bg-paper-200 transition-[transform,box-shadow] duration-300 ease-out group-hover:-translate-y-1 group-hover:[box-shadow:var(--shadow-lift)]"
        style={{ aspectRatio: String(ratio) }}
      >
        {coverUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverUrl}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-[800ms] ease-out group-hover:scale-[1.04]"
          />
        )}
      </div>
      <h3 className="mt-3 font-serif text-2xl leading-snug transition-colors group-hover:text-terracotta">
        {title}
      </h3>
      <p className="mt-1 text-sm text-ink/60">
        {photoCount} {photoCount === 1 ? "photo" : "photos"}
        {range && ` · ${range}`}
      </p>
      {author && <p className="text-xs text-ink/55">by {author}</p>}
    </Link>
  )
}

function formatRange(dateRange: { from: string; to: string } | null): string | null {
  if (!dateRange) return null
  const from = new Date(dateRange.from).getFullYear()
  const to = new Date(dateRange.to).getFullYear()
  return from === to ? String(from) : `${from}–${to}`
}
