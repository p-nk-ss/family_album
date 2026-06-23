import type { NextAuthConfig } from "next-auth"
import Google from "next-auth/providers/google"
import { isAllowlisted } from "@/lib/auth-allowlist"

export const authConfig = {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  session: { strategy: "jwt" },
  pages: { signIn: "/signin" },
  callbacks: {
    async signIn({ profile }) {
      return isAllowlisted(profile?.email)
    },
    async session({ session, token }) {
      if (session.user && token.userId) {
        session.user.id = token.userId as string
        session.user.role = (token.role as "admin" | "member") ?? "member"
      }
      return session
    },
  },
} satisfies NextAuthConfig
