import type { Metadata } from 'next'
import { Inter, Fraunces, PT_Serif } from 'next/font/google'
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

// Reading — the digest itself. PT Serif is a Cyrillic-first face: it was
// drawn by ParaType for the scripts of the Russian Federation, so the Cyrillic
// is the design rather than an extension of a Latin one. Wide counters and a
// tall x-height make it hold up better than Literata at reading size.
const ptSerif = PT_Serif({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-serif',
  weight: ['400', '700'],
  style: ['normal', 'italic'],
})

export const metadata: Metadata = {
  title: 'News Digest',
  description: 'Daily AI-powered news summaries',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="bg"
      className={`h-full ${fraunces.variable} ${ptSerif.variable}`}
      suppressHydrationWarning
    >
      <body className={`${inter.className} h-full antialiased`}>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
