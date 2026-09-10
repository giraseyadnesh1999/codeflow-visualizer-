import type { Metadata, Viewport } from 'next'
import './globals.css'
import { ServiceWorker } from '@/components/ServiceWorker'

export const metadata: Metadata = {
  title: 'CodeFlow — Step-by-step Code Execution Visualizer',
  description:
    'Watch JavaScript run one step at a time. See the call stack, scopes, memory and console update live — built for developers and students learning how code actually works.',
  applicationName: 'CodeFlow',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'CodeFlow' },
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180' }],
  },
  keywords: ['javascript visualizer', 'code execution', 'call stack', 'learn to code', 'debugger', 'PWA'],
}

export const viewport: Viewport = {
  themeColor: '#08060f',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh antialiased">
        <div className="aurora" aria-hidden>
          <div className="aurora-grid animate-grid-drift" />
        </div>
        <div className="relative z-10">{children}</div>
        <ServiceWorker />
      </body>
    </html>
  )
}
