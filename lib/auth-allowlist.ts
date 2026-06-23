export function isAllowlisted(email: string | null | undefined): boolean {
  if (!email) return false
  const raw = process.env.ALLOWLIST_EMAILS ?? ""
  const allowed = raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
  return allowed.includes(email.trim().toLowerCase())
}
