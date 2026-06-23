import { Uploader } from "@/components/upload/Uploader"

export default function UploadPage() {
  return (
    <main className="max-w-xl mx-auto px-6 py-16">
      <h1 className="font-serif text-4xl mb-3">Upload a photo</h1>
      <p className="text-ink/60 mb-8">
        Photos land in your library first. Once uploaded, you arrange them into
        an album (title, cover, order) — that&rsquo;s where they become a story.
      </p>
      <Uploader />
    </main>
  )
}
