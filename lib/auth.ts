import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import { prisma } from "@/lib/db"
import { isAllowlisted } from "@/lib/auth-allowlist"

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async signIn({ profile }) {
      return isAllowlisted(profile?.email)
    },
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
    async session({ session, token }) {
      if (session.user && token.userId) {
        session.user.id = token.userId as string
        session.user.role = (token.role as "admin" | "member") ?? "member"
      }
      return session
    },
  },
})
