"use client"

import { useState, useEffect, useRef } from "react"
import { decode } from "blurhash"

export function BlurUpImage({
  src,
  blurhash,
  width,
  height,
  alt,
}: {
  src: string
  blurhash: string | null
  width: number | null
  height: number | null
  alt: string
}) {
  const [loaded, setLoaded] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!blurhash || !canvasRef.current) return
    const pixels = decode(blurhash, 32, 32)
    const ctx = canvasRef.current.getContext("2d")!
    const imageData = ctx.createImageData(32, 32)
    imageData.data.set(pixels)
    ctx.putImageData(imageData, 0, 0)
  }, [blurhash])

  return (
    <div className="relative overflow-hidden rounded-lg bg-paper-200">
      {blurhash && (
        <canvas
          ref={canvasRef}
          width={32}
          height={32}
          className={`absolute inset-0 h-full w-full transition-opacity duration-500 ${loaded ? "opacity-0" : "opacity-100"}`}
        />
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        className={`block w-full transition-opacity duration-500 ${loaded ? "opacity-100" : "opacity-0"}`}
      />
    </div>
  )
}
