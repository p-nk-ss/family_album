"use client"
import { useEffect, useState } from "react"

type Comment = { id: string; body: string; authorName: string | null; createdAt: string }

export function CommentThread({ photoId }: { photoId: string }) {
  const [comments, setComments] = useState<Comment[]>([])
  const [body, setBody] = useState("")

  async function load() {
    const res = await fetch(`/api/photos/${photoId}/comments`)
    if (res.ok) {
      setComments((await res.json()).comments)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photoId])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!body.trim()) return
    await fetch(`/api/photos/${photoId}/comments`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ body }),
    })
    setBody("")
    load()
  }

  return (
    <div className="mt-8 space-y-4">
      {comments.map((c) => (
        <div key={c.id}>
          <span className="font-medium">{c.authorName ?? "Someone"}:</span>{" "}
          <span className="text-ink/80">{c.body}</span>
        </div>
      ))}
      <form onSubmit={submit} className="flex gap-2">
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Add a memory…"
          className="flex-1 border-b border-ink/20 bg-transparent py-2 outline-none"
        />
        <button type="submit" className="text-terracotta">
          Post
        </button>
      </form>
    </div>
  )
}
