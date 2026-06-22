import { PrismaClient } from "../generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

// Prisma 7 requires a driver adapter at runtime. Use the POOLED connection
// (DATABASE_URL, the "-pooler" endpoint) for the application client.
function createPrismaClient() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
  return new PrismaClient({ adapter })
}

// In dev, Next.js re-evaluates modules on every hot reload. Without a cached
// instance each reload would open a new pool and exhaust DB connections, so we
// stash a single client on globalThis and reuse it. In production a fresh
// instance per server process is fine.
const globalForPrisma = globalThis as unknown as {
  prisma?: ReturnType<typeof createPrismaClient>
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma
}
