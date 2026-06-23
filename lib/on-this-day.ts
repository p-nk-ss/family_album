export function matchesToday(takenAt: Date, today: { month: number; day: number }): boolean {
  return takenAt.getUTCMonth() + 1 === today.month && takenAt.getUTCDate() === today.day
}

export function groupByYear<T extends { takenAt: Date }>(photos: T[]): Map<number, T[]> {
  const map = new Map<number, T[]>()
  for (const p of photos) {
    const y = p.takenAt.getUTCFullYear()
    if (!map.has(y)) map.set(y, [])
    map.get(y)!.push(p)
  }
  return map
}
