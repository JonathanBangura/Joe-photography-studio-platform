import type { Metadata, Viewport } from 'next'
import { ThemeProvider } from '@/components/theme-provider'
import { PWAInstallPrompt } from '@/components/pwa-install-prompt'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'JoeStudio Photography',
    template: '%s | JoeStudio',
  },
  description:
    'Book photography sessions, explore JoeStudio portfolios, and access client galleries.',
  applicationName: 'JoeStudio',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'JoeStudio',
  },
  icons: {
    icon: [
      {
        url: '/pwa-icon-192.png',
        type: 'image/png',
        sizes: '192x192',
      },
    ],
    apple: [
      {
        url: '/pwa-icon-180.png',
        type: 'image/png',
        sizes: '180x180',
      },
    ],
  },
  formatDetection: {
    telephone: false,
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#c98a00' },
    { media: '(prefers-color-scheme: dark)', color: '#171411' },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {children}
          <PWAInstallPrompt />
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
