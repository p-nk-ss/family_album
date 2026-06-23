import exifr from "exifr"

export interface ExifMeta {
  takenAt: string | null
  width: number | null
  height: number | null
  orientation: number | null
}

export async function parseExif(file: Blob): Promise<ExifMeta> {
  try {
    const buffer = await file.arrayBuffer()
    const data = await exifr.parse(buffer, {
      pick: ["DateTimeOriginal", "CreateDate", "ExifImageWidth", "ExifImageHeight", "Orientation"],
    })
    if (!data) return { takenAt: null, width: null, height: null, orientation: null }
    const date: Date | undefined = data.DateTimeOriginal ?? data.CreateDate
    return {
      takenAt: date instanceof Date ? date.toISOString() : null,
      width: data.ExifImageWidth ?? null,
      height: data.ExifImageHeight ?? null,
      orientation: data.Orientation ?? null,
    }
  } catch {
    return { takenAt: null, width: null, height: null, orientation: null }
  }
}
