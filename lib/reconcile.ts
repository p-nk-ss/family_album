export function isOrphan(
  key: string,
  knownKeys: Set<string>,
  lastModified: Date,
  now: Date,
  minAgeHours = 6
): boolean {
  if (knownKeys.has(key)) return false
  const ageMs = now.getTime() - lastModified.getTime()
  return ageMs >= minAgeHours * 60 * 60 * 1000
}
