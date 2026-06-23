import type { NextAuthConfig } from "next-auth"
import Google from "next-auth/providers/google"
import Credentials from "next-auth/providers/credentials"
import { isAllowlisted } from "@/lib/auth-allowlist"

// DEV ONLY: passwordless local login for verifying the app without Google OAuth.
// Hard-gated by NODE_ENV !== "production" AND DEV_AUTH=true — never active in prod.
// The dev email must be present in ALLOWLIST_EMAILS (the allowlist gate still applies).
const devAuthEnabled =
  process.env.NODE_ENV !== "production" && process.env.DEV_AUTH === "true"

export const authConfig = {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    ...(devAuthEnabled
      ? [
          Credentials({
            id: "dev",
            name: "Dev login",
            credentials: {},
            authorize: async () => ({
              id: "dev",
              email:
                process.env.DEV_LOGIN_EMAIL ??
                process.env.OWNER_EMAIL ??
                "dev@local",
              name: "Dev User",
            }),
          }),
        ]
      : []),
  ],
  session: { strategy: "jwt" },
  pages: { signIn: "/signin" },
  callbacks: {
    async signIn({ user, profile }) {
      return isAllowlisted(profile?.email ?? user?.email)
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
