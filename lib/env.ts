export function env(key: string, fallback?: string): string {
  const value = process.env[key]
  if (value === undefined || value === "") {
    if (fallback !== undefined) return fallback
    throw new Error(`Missing required env var: ${key}`)
  }
  return value
}
