import NextAuth from "next-auth"
import { prisma } from "@/lib/db"
import { authConfig } from "@/auth.config"

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, profile }) {
      if (profile?.email) {
        const email = profile.email
        const user = await prisma.user.upsert({
          where: { email },
          update: {
            name: profile.name ?? undefined,
            avatarUrl: (profile as { picture?: string }).picture ?? undefined,
          },
          create: {
            email,
            name: profile.name ?? email.split("@")[0],
            avatarUrl: (profile as { picture?: string }).picture ?? null,
            role:
              email.toLowerCase() === (process.env.OWNER_EMAIL ?? "").toLowerCase()
                ? "admin"
                : "member",
          },
        })
        token.userId = user.id
        token.role = user.role
      }
      return token
    },
  },
})
