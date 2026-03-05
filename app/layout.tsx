import type { Metadata, Viewport } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'
import { AuthProvider } from '@/contexts/auth-context'
import { ThemeProvider } from '@/components/theme-provider'
import { DevModeBanner } from '@/components/dev-mode-banner'
import { ServiceWorkerRegister } from '@/components/service-worker-register'

export const metadata: Metadata = {
  title: 'BerkConnect - Berkeley Prep',
  description:
    'Connect with your school community. Share updates, join clubs, and stay informed about campus life.',
  generator: 'v0.app',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'BerkConnect',
  },
  icons: {
    icon: '/icon-192.png',
    shortcut: '/icon-192.png',
    apple: '/apple-touch-icon.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
}

// ✅ Combine your fonts once outside the component (server-safe)
const fontVars = `${GeistSans.variable} ${GeistMono.variable}`

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      {/* ✅ Apply deterministic, precomputed font vars */}
      <body className={`font-sans ${fontVars}`} suppressHydrationWarning>
        <DevModeBanner />
        <ServiceWorkerRegister />
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false} // 🔧 make deterministic theme
          disableTransitionOnChange
        >
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
