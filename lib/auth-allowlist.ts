export function isAllowlisted(email: string | null | undefined): boolean {
  if (!email) return false
  const normalized = email.trim().toLowerCase()

  // The owner is always allowed — even with an empty/absent ALLOWLIST_EMAILS —
  // so a misconfigured allowlist can never lock the owner out.
  const owner = (process.env.OWNER_EMAIL ?? "").trim().toLowerCase()
  if (owner && normalized === owner) return true

  const allowed = (process.env.ALLOWLIST_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
  return allowed.includes(normalized)
}
