import type { Metadata, Viewport } from 'next'
import { connection } from 'next/server'
import type { ReactNode } from 'react'

import { CookieBanner } from '@/components/CookieBanner'
import { MenuSheet } from '@/components/MenuSheet'
import { MobileTabBar } from '@/components/MobileTabBar'
import { ShellProvider } from '@/components/shell/ShellProvider'
import { SiteFooter } from '@/components/SiteFooter'
import { SiteHeader } from '@/components/SiteHeader'
import { analyticsScript } from '@/lib/analytics'
import { getEnv } from '@/lib/env'
import { features } from '@/lib/features'
import { DESCRIPTIONS, isIndexable, OPEN_GRAPH, SITE_NAME } from '@/lib/seo'
import { company, cookieBannerEnabled, menuCreatures } from '@/lib/site'

import { fontVariables } from './fonts'
import './globals.css'

/**
 * Defaults of every page (spec. §23). Per request, not at build time: one image serves staging and
 * production, so the site address (canonical links, Open Graph) and `noindex` come from the
 * server's environment — a page rendered in `docker build` would keep the build's values.
 * Pages set their own title, description and `alternates.canonical` (relative to `metadataBase`).
 */
export async function generateMetadata(): Promise<Metadata> {
  await connection()
  const env = getEnv()
  return {
    metadataBase: new URL(env.SITE_URL),
    title: { default: SITE_NAME, template: `%s | ${SITE_NAME}` },
    description: DESCRIPTIONS.home,
    openGraph: OPEN_GRAPH,
    // Staging and local runs never get indexed; a page's own `robots` (account, certificate…)
    // replaces this object, and those pages are `noindex` everywhere anyway.
    ...(isIndexable(env.SITE_ENV) ? {} : { robots: { index: false, follow: false } }),
  }
}

// `cover`: lets env(safe-area-inset-bottom) lift the tab bar above the iPhone home bar.
export const viewport: Viewport = { viewportFit: 'cover' }

export default async function SiteLayout({ children }: { children: ReactNode }) {
  // Per request, like the metadata: the statistics script belongs to this server's environment.
  await connection()
  const flags = features()
  const stats = analyticsScript(getEnv())
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
        {/* Umami without cookies (ADR-G009): deferred, never blocks the page; `track()` works
            without it. Only on production and staging. */}
        {stats && <script defer src={stats.src} data-website-id={stats.websiteId} />}
      </body>
    </html>
  )
}
