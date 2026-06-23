import NextAuth from "next-auth"
import { prisma } from "@/lib/db"
import { authConfig } from "@/auth.config"

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user, profile }) {
      // First sign-in: `profile` is set for OAuth (Google); `user` is set for the
      // dev Credentials provider. Either way, upsert our row and stamp id/role.
      const email = profile?.email ?? user?.email
      if (email) {
        const name = profile?.name ?? user?.name ?? email.split("@")[0]
        const avatarUrl =
          (profile as { picture?: string } | null)?.picture ?? user?.image ?? null
        const dbUser = await prisma.user.upsert({
          where: { email },
          update: { name, avatarUrl: avatarUrl ?? undefined },
          create: {
            email,
            name,
            avatarUrl,
            role:
              email.toLowerCase() === (process.env.OWNER_EMAIL ?? "").toLowerCase()
                ? "admin"
                : "member",
          },
        })
        token.userId = dbUser.id
        token.role = dbUser.role
      }
      return token
    },
  },
})
