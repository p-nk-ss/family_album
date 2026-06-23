import Link from "next/link"
import { PressableCard } from "@/components/motion/PressableCard"

export function AlbumCard({
  id,
  title,
  author,
  coverThumbUrl,
  photoCount,
  dateRange,
}: {
  id: string
  title: string
  author?: string | null
  coverThumbUrl: string | null
  photoCount: number
  dateRange: { from: string; to: string } | null
}) {
  const range = dateRange
    ? `${new Date(dateRange.from).getFullYear()}${
        new Date(dateRange.from).getFullYear() !==
        new Date(dateRange.to).getFullYear()
          ? `–${new Date(dateRange.to).getFullYear()}`
          : ""
      }`
    : ""

  return (
    <PressableCard>
      <Link href={`/albums/${id}`} className="group block">
        <div className="aspect-[4/3] overflow-hidden rounded-xl bg-paper-200">
          {coverThumbUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={coverThumbUrl}
              alt=""
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
          )}
        </div>
        <h3 className="mt-3 font-serif text-2xl">{title}</h3>
        <p className="text-sm text-ink/50">
          {photoCount} photos{range && ` · ${range}`}
        </p>
        {author && (
          <p className="mt-0.5 text-xs text-ink/40">by {author}</p>
        )}
      </Link>
    </PressableCard>
  )
}
