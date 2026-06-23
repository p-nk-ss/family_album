import { auth } from "@/lib/auth"

export class UnauthorizedError extends Error {}

export async function requireUser(): Promise<{ id: string; role: "admin" | "member" }> {
  const session = await auth()
  if (!session?.user?.id) throw new UnauthorizedError("Not signed in")
  return { id: session.user.id, role: session.user.role }
}
