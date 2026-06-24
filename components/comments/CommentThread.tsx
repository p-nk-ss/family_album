"use client"
import { useEffect, useRef, useState } from "react"

type Comment = {
  id: string
  body: string
  authorName: string | null
  createdAt: string
}

export function CommentThread({ photoId }: { photoId: string }) {
  const [comments, setComments] = useState<Comment[]>([])
  const [body, setBody] = useState("")
  const [pending, setPending] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function load() {
    const res = await fetch(`/api/photos/${photoId}/comments`)
    if (res.ok) setComments((await res.json()).comments)
  }

  useEffect(() => {
    setComments([])
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photoId])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const text = body.trim()
    if (!text || pending) return
    setPending(true)
    await fetch(`/api/photos/${photoId}/comments`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ body: text }),
    })
    setBody("")
    await load()
    setPending(false)
    inputRef.current?.focus()
  }

  return (
    <div className="space-y-4">
      {comments.length > 0 ? (
        <ul className="space-y-3">
          {comments.map((c) => (
            <li key={c.id} className="text-sm leading-relaxed">
              <span className="font-medium text-terracotta">
                {c.authorName ?? "Someone"}
              </span>
              <span className="ml-2 text-ink/80">{c.body}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-ink/60">Be the first to leave a memory.</p>
      )}
      <form onSubmit={submit} className="flex items-center gap-3">
        <input
          ref={inputRef}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          aria-label="Add a memory"
          placeholder="Add a memory…"
          className="flex-1 border-b border-ink/15 bg-transparent py-2 text-sm outline-none transition-colors placeholder:text-ink/55 focus:border-terracotta"
        />
        <button
          type="submit"
          disabled={pending || !body.trim()}
          className="text-sm font-medium text-terracotta transition-opacity disabled:opacity-30"
        >
          Post
        </button>
      </form>
    </div>
  )
}
