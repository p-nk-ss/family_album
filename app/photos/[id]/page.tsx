import { notFound } from "next/navigation"
import { prisma } from "@/lib/db"
import { presignGet } from "@/lib/r2"
import { Lightbox } from "@/components/motion/Lightbox"
import { CommentThread } from "@/components/comments/CommentThread"

export const dynamic = "force-dynamic"

export default async function PhotoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const photo = await prisma.photo.findUnique({ where: { id } })
  if (!photo) notFound()
  const src = await presignGet({ key: photo.r2Key })
  return (
    <main className="max-w-4xl mx-auto px-6 py-12">
      <Lightbox src={src} alt={photo.caption ?? ""} photoId={photo.id} />
      {photo.caption && (
        <p className="mt-6 font-serif italic text-center text-ink/70">
          {photo.caption}
        </p>
      )}
      <CommentThread photoId={photo.id} />
    </main>
  )
}
