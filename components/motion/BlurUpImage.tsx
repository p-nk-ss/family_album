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
  // Seed the aspect ratio from stored dimensions (avoids layout shift), but
  // correct it from the actual decoded image on load — the thumbnail is always
  // correctly oriented, so this fixes photos whose stored dims ignored EXIF
  // rotation.
  const [ratio, setRatio] = useState<number | undefined>(
    width && height ? width / height : undefined,
  )
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!blurhash || !canvasRef.current) return
    const pixels = decode(blurhash, 32, 32)
    const ctx = canvasRef.current.getContext("2d")
    if (!ctx) return
    const imageData = ctx.createImageData(32, 32)
    imageData.data.set(pixels)
    ctx.putImageData(imageData, 0, 0)
  }, [blurhash])

  return (
    <div
      className="relative w-full overflow-hidden bg-paper-200"
      style={{ aspectRatio: ratio ? String(ratio) : undefined }}
    >
      {blurhash && (
        <canvas
          ref={canvasRef}
          width={32}
          height={32}
          className={`absolute inset-0 h-full w-full scale-105 transition-opacity duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] ${
            loaded ? "opacity-0" : "opacity-100"
          }`}
        />
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        onLoad={(e) => {
          setLoaded(true)
          const t = e.currentTarget
          if (t.naturalWidth && t.naturalHeight)
            setRatio(t.naturalWidth / t.naturalHeight)
        }}
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] ${
          loaded ? "opacity-100" : "opacity-0"
        }`}
      />
    </div>
  )
}
