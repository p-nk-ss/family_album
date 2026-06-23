import { encode, isBlurhashValid } from "blurhash"

export function encodeBlurhash(
  pixels: Uint8ClampedArray,
  width: number,
  height: number
): string {
  return encode(pixels, width, height, 4, 3)
}

export function isValidBlurhash(hash: string): boolean {
  if (!hash) return false
  return isBlurhashValid(hash).result
}
