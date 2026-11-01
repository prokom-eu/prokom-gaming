import type { MetadataRoute } from 'next'

import type { Features } from './features'
import { routes } from './nav'
import { zl } from './pricing/format'
import { company, social } from './site'

/**
 * SEO of the site (spec. §23): titles, descriptions, structured data, sitemap and robots rules.
 * Pure functions — pages, `sitemap.ts` and `robots.ts` pass the site address and data in.
 */

export const SITE_NAME = 'PRO-KOM Gaming'

/**
 * Open Graph shared by every page. A page that sets `openGraph` replaces the whole object, so it
 * spreads this first (Next merges metadata one level deep).
 */
export const OPEN_GRAPH = { siteName: SITE_NAME, locale: 'pl_PL', type: 'website' } as const

// TODO(krystian): the home title and the descriptions below are a draft from the phrases of
// spec. §23 and the board texts (no copy for them in the boards) — to accept before G16.
export const HOME_TITLE = 'Komputery do gier składane w Rabce-Zdroju | PRO-KOM Gaming'

export const DESCRIPTIONS = {
  home: 'Komputery do gier składane ręcznie w Rabce-Zdroju: 16 gotowych zestawów od FullHD do 4K, konfigurator z ceną na żywo i klatki w 33 grach z niezależnych testów. Każdy z metryką.',
  builds:
    '16 komputerów do gier od FullHD do 4K, z ceną brutto i klatkami w popularnych grach. Wybierz po monitorze, budżecie i rodzaju — od komputera dla dziecka po biały komputer gamingowy.',
} as const

/** Search engines index only production; staging and local runs stay out (spec. §23). */
export const isIndexable = (siteEnv: string): boolean => siteEnv === 'production'

/**
 * Title of a build page, spec. §23: „{Istota} — komputer do gier {rozdzielczość}, {cena} zł |
 * PRO-KOM Gaming”. Without a published price the price part is left out (no „—” in a title).
 */
export function buildTitle(name: string, resolution: string, price: number | null): string {
  const priced = price === null ? '' : `, ${zl(price)}`
  return `${name} — komputer do gier ${resolution}${priced} | ${SITE_NAME}`
}

export type Crumb = { name: string; path: string }

/** `BreadcrumbList` from the home page down to the page itself (last crumb). */
export function breadcrumbJsonLd(siteUrl: string, crumbs: readonly Crumb[]): object {
  const all: Crumb[] = [{ name: 'Strona główna', path: routes.home }, ...crumbs]
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: all.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: new URL(c.path, siteUrl).toString(),
    })),
  }
}

const postalAddress = {
  '@type': 'PostalAddress',
  streetAddress: company.postal.street,
  postalCode: company.postal.code,
  addressLocality: company.postal.city,
  addressCountry: 'PL',
} as const

/**
 * `Organization` (the Gaming brand of PRO-KOM) and `LocalBusiness` (the one shop, in Rabka-Zdrój —
 * no salon in Zakopane, Krystian 01.11.2026) for the home page. Profiles only when known.
 */
export function organizationJsonLd(siteUrl: string): object[] {
  const home = new URL(routes.home, siteUrl).toString()
  const orgId = `${home}#organizacja`
  const sameAs = social.map((s) => s.href).filter(Boolean)
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      '@id': orgId,
      name: SITE_NAME,
      legalName: company.name,
      url: home,
      logo: new URL('/logo-512.png', siteUrl).toString(),
      email: company.email,
      telephone: company.phone,
      vatID: `PL${company.nip.replace(/\D/g, '')}`,
      address: postalAddress,
      parentOrganization: {
        '@type': 'Organization',
        name: company.name,
        url: company.parentSite.href,
      },
      ...(sameAs.length ? { sameAs } : {}),
    },
    {
      '@context': 'https://schema.org',
      // ComputerStore is a LocalBusiness (schema.org: Store → LocalBusiness).
      '@type': 'ComputerStore',
      '@id': `${home}#sklep`,
      name: `${SITE_NAME} — sklep w Rabce-Zdroju`,
      url: new URL(routes.contact, siteUrl).toString(),
      email: company.email,
      telephone: company.phone,
      address: postalAddress,
      parentOrganization: { '@id': orgId },
      // TODO(krystian): opening hours and map coordinates of the shop [SZEF] — added when known.
    },
  ]
}

/** Pages in the sitemap that are always on (spec. §23: no certificate, account or inquiry). */
const STATIC_PAGES = [
  routes.home,
  routes.builds,
  routes.configurator,
  routes.gamePicker,
  routes.compare,
  routes.parents,
  routes.about,
  routes.contact,
  routes.faq,
  routes.guides,
  routes.terms,
  routes.privacy,
] as const

/**
 * Sitemap (spec. §23): fixed pages, 16 builds, 33 games and published guides; „Gotowe od ręki”
 * and the voucher only while their page is on (`lib/features.ts`).
 */
export function sitemapEntries(input: {
  siteUrl: string
  builds: readonly string[]
  games: readonly string[]
  guides: readonly string[]
  features: Pick<Features, 'ready' | 'voucher'>
}): MetadataRoute.Sitemap {
  const paths = [
    ...STATIC_PAGES,
    ...(input.features.ready ? [routes.stock] : []),
    ...(input.features.voucher ? [routes.voucher] : []),
    ...input.builds.map((slug) => `${routes.builds}/${slug}`),
    ...input.games.map((slug) => `/komputer-do/${slug}`),
    ...input.guides.map((slug) => `${routes.guides}/${slug}`),
  ]
  return paths.map((path) => ({ url: new URL(path, input.siteUrl).toString() }))
}

/** robots.txt: production lets crawlers in except the panel and the API; elsewhere nothing. */
export function robotsRules(siteUrl: string, siteEnv: string): MetadataRoute.Robots {
  if (!isIndexable(siteEnv)) return { rules: { userAgent: '*', disallow: '/' } }
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/admin', '/api/'] },
    sitemap: new URL('/sitemap.xml', siteUrl).toString(),
  }
}
