import Link from "next/link"
import { FadeIn } from "@/components/motion/FadeIn"

export default function Home() {
  return (
    <main className="min-h-[calc(100vh-73px)] flex flex-col items-center justify-center text-center px-6">
      <FadeIn>
        <p className="uppercase tracking-[0.3em] text-sm text-terracotta mb-6">
          est. at home
        </p>
        <h1 className="font-serif text-6xl md:text-8xl leading-none">
          Family Albums
        </h1>
        <p className="mt-6 max-w-md text-lg text-ink/70">
          A quiet place to keep our stories — albums, not a date dump.
        </p>
        <Link
          href="/library"
          className="mt-10 inline-block rounded-full bg-terracotta px-8 py-3 text-paper font-medium"
        >
          Enter the library
        </Link>
      </FadeIn>
    </main>
  )
}
