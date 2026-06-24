import type { Metadata } from 'next'
import { Inter, Fraunces, Literata } from 'next/font/google'
import { ThemeProvider } from '@/components/theme-provider'
import './globals.css'

// UI chrome — sidebar, pills, labels
const inter = Inter({ subsets: ['latin', 'cyrillic'], variable: '--font-sans' })

// Display — the Latin dateline masthead (warm, characterful old-style serif)
const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-display',
  style: ['normal', 'italic'],
})

// Reading — the digest itself, set like a printed edition (full Cyrillic)
const literata = Literata({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-serif',
  style: ['normal', 'italic'],
})

export const metadata: Metadata = {
  title: 'News Digest',
  description: 'Daily AI-powered news summaries',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`h-full ${fraunces.variable} ${literata.variable}`}
      suppressHydrationWarning
    >
      <body className={`${inter.className} h-full antialiased`}>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
