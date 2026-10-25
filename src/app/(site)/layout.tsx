import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import './globals.css'

// TODO(krystian): title template, description and the site shell (header, tab bar, footer) in G2.
export const metadata: Metadata = {
  title: 'PRO-KOM Gaming',
}

export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pl">
      <body>{children}</body>
    </html>
  )
}
