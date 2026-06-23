import { prisma } from "@/lib/db"
import { signPhotoList } from "@/lib/dto"
import { BlurUpImage } from "@/components/motion/BlurUpImage"

export const dynamic = "force-dynamic"

export default async function LibraryPage() {
  const rows = await prisma.photo.findMany({
    orderBy: [{ takenAt: "desc" }, { uploadedAt: "desc" }],
    take: 200,
  })
  const photos = await signPhotoList(rows)

  return (
    <main className="max-w-6xl mx-auto px-6 py-12">
      <h1 className="font-serif text-5xl mb-8">The Library</h1>
      <div
        data-testid="photo-grid"
        className="columns-2 md:columns-3 lg:columns-4 gap-4 [&>*]:mb-4"
      >
        {photos.map((p) => (
          <BlurUpImage
            key={p.id}
            src={p.thumbUrl}
            blurhash={p.blurhash}
            width={p.width}
            height={p.height}
            alt=""
          />
        ))}
      </div>
    </main>
  )
}
