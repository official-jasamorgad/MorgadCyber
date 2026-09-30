import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: '1024 Tera — Digital Marketplace',
    template: '%s | 1024 Tera',
  },
  description: 'Platform marketplace produk digital terpercaya. Software, template, e-book, dan aset digital premium.',
  metadataBase: new URL(process.env.APP_URL ?? 'http://localhost:3000'),
  openGraph: {
    type: 'website',
    locale: 'id_ID',
    siteName: '1024 Tera Digital Marketplace',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  )
}
