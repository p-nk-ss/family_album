import { Uploader } from "@/components/upload/Uploader"

export default function UploadPage() {
  return (
    <main className="max-w-xl mx-auto px-6 py-16">
      <h1 className="font-serif text-4xl mb-8">Upload a photo</h1>
      <Uploader />
    </main>
  )
}
