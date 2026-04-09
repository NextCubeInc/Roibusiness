import { Geist, Geist_Mono, Roboto_Slab, Roboto } from "next/font/google"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { cn } from "@/lib/utils";
import { Analytics } from "@vercel/analytics/next"

const robotoHeading = Roboto({subsets:['latin'],variable:'--font-heading'});

const robotoSlab = Roboto_Slab({subsets:['latin'],variable:'--font-serif'});

const fontSans = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
})

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("antialiased", fontSans.variable, fontMono.variable, "font-serif", robotoSlab.variable, robotoHeading.variable)}
    >
      <body>
        <Analytics/>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
