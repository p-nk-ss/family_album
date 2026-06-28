import type { Metadata } from "next"
import { Fraunces, Inter, Caveat } from "next/font/google"
import "./globals.css"
import { Providers } from "@/app/providers"
import { Nav } from "@/components/ui/Nav"

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
})

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
})

// Handwriting for the "inscription on the back of the print" — see .photo-note.
// Cyrillic subset: the family writes notes in Russian.
const caveat = Caveat({
  subsets: ["latin", "cyrillic"],
  variable: "--font-caveat",
  display: "swap",
})

export const metadata: Metadata = {
  title: "Family Albums",
  description: "A private home for our family's photos.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${inter.variable} ${caveat.variable}`}
    >
      <body className="font-sans antialiased">
        <Providers>
          <Nav />
          {children}
        </Providers>
      </body>
    </html>
  )
}
