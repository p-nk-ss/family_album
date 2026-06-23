"use client"

import { signIn } from "next-auth/react"

export default function SignInPage() {
  return (
    <main className="min-h-screen bg-paper flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm text-center space-y-8">
        <h1 className="font-serif text-4xl text-ink leading-tight">
          Family Albums
        </h1>
        <p className="font-sans text-ink/60 text-sm">
          A private home for our family&apos;s photos.
        </p>
        <button
          onClick={() => signIn("google", { callbackUrl: "/library" })}
          className="w-full bg-terracotta text-paper font-sans font-medium py-3 px-6 rounded-lg hover:opacity-90 active:opacity-80 transition-opacity"
        >
          Sign in with Google
        </button>
      </div>
    </main>
  )
}
