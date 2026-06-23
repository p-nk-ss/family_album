import Link from "next/link"
import { BlurUpImage } from "@/components/motion/BlurUpImage"

export function StoryPhoto({
  id,
  src,
  blurhash,
  width,
  height,
  caption,
}: {
  id: string
  src: string
  blurhash: string | null
  width: number | null
  height: number | null
  caption: string | null
}) {
  return (
    <figure className="mb-16">
      <Link
        href={`/photos/${id}`}
        style={{ viewTransitionName: `photo-${id}` }}
        className="block"
      >
        <BlurUpImage
          src={src}
          blurhash={blurhash}
          width={width}
          height={height}
          alt={caption ?? ""}
        />
      </Link>
      {caption && (
        <figcaption className="mt-3 text-ink/60 font-serif italic">
          {caption}
        </figcaption>
      )}
    </figure>
  )
}
