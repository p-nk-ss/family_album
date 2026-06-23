export interface Position {
  photoId: string
  position: number
}

export function positionsFor(orderedPhotoIds: string[]): Position[] {
  return orderedPhotoIds.map((photoId, position) => ({ photoId, position }))
}

export function applyReorder(current: Position[], orderedPhotoIds: string[]): Position[] {
  const currentIds = new Set(current.map((p) => p.photoId))
  if (
    orderedPhotoIds.length !== current.length ||
    !orderedPhotoIds.every((id) => currentIds.has(id)) ||
    new Set(orderedPhotoIds).size !== orderedPhotoIds.length
  ) {
    throw new Error("orderedPhotoIds must be a permutation of the album's current photos")
  }
  return positionsFor(orderedPhotoIds)
}
