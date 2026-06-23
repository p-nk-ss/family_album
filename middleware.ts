import NextAuth from "next-auth"
import { NextResponse } from "next/server"
import { authConfig } from "@/auth.config"

const { auth } = NextAuth(authConfig)

export default auth((req) => {
  if (!req.auth) {
    return NextResponse.redirect(new URL("/signin", req.nextUrl.origin))
  }
})

export const config = {
  matcher: ["/upload", "/library/:path*", "/albums/:path*", "/photos/:path*", "/on-this-day"],
}
