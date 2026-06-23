import { presignGet } from "@/lib/r2"

export interface PhotoListItem {
  id: string
  thumbUrl: string
  blurhash: string | null
  width: number | null
  height: number | null
  takenAt: string | null
}

type PhotoRow = {
  id: string
  thumbKey: string | null
  r2Key: string
  blurhash: string | null
  width: number | null
  height: number | null
  takenAt: Date | null
}

export async function signPhotoList(rows: PhotoRow[]): Promise<PhotoListItem[]> {
  return Promise.all(
    rows.map(async (r) => ({
      id: r.id,
      thumbUrl: await presignGet({ key: r.thumbKey ?? r.r2Key }),
      blurhash: r.blurhash,
      width: r.width,
      height: r.height,
      takenAt: r.takenAt ? r.takenAt.toISOString() : null,
    }))
  )
}
