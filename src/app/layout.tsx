import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { PwaRegister } from '@/components/pwa-register'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'avaia - Gestionale',
  description: 'Gestione multi-aziendale semplice e moderna',
  manifest: '/manifest',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'avaia' },
}

export const viewport: Viewport = {
  themeColor: '#16a34a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body className={inter.className}>
        {children}
        <PwaRegister />
      </body>
    </html>
  )
}
