import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'

import { CookieBanner } from '@/components/CookieBanner'
import { MenuSheet } from '@/components/MenuSheet'
import { MobileTabBar } from '@/components/MobileTabBar'
import { ShellProvider } from '@/components/shell/ShellProvider'
import { SiteFooter } from '@/components/SiteFooter'
import { SiteHeader } from '@/components/SiteHeader'
import { features } from '@/lib/features'
import { company, cookieBannerEnabled, menuCreatures } from '@/lib/site'

import { fontVariables } from './fonts'
import './globals.css'

// TODO(krystian): G15 — description, Open Graph, `metadataBase` from the site URL (spec. §23).
export const metadata: Metadata = {
  title: { default: 'PRO-KOM Gaming', template: '%s | PRO-KOM Gaming' },
}

// `cover`: lets env(safe-area-inset-bottom) lift the tab bar above the iPhone home bar.
export const viewport: Viewport = { viewportFit: 'cover' }

export default function SiteLayout({ children }: { children: ReactNode }) {
  const flags = features()
  return (
    <html lang="pl" className={fontVariables}>
      <body>
        <a className="skip-link" href="#tresc">
          Przejdź do treści
        </a>
        <ShellProvider>
          <SiteHeader />
          <main id="tresc">{children}</main>
          <SiteFooter features={flags} />
          <MobileTabBar />
          <MenuSheet
            creatures={menuCreatures}
            phone={{ label: company.phone, href: company.phoneHref }}
            features={flags}
          />
          <CookieBanner enabled={cookieBannerEnabled} />
        </ShellProvider>
      </body>
    </html>
  )
}
