import type { MetadataRoute } from 'next'

import type { Features } from './features'
import { routes } from './nav'
import { organizationId } from './offerTerms'
import { zl } from './pricing/format'
import { company, shopDirections, social } from './site'

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

/** Longest meta description we write: Google cuts snippets at about 155–160 characters. */
export const DESCRIPTION_MAX = 160

/** Longest title we write: Google cuts titles at about 60–65 characters (≈ 600 px). */
export const TITLE_MAX = 65

// TODO(krystian): the home title and the descriptions below are a draft from the phrases of
// spec. §23 and the board texts (no copy for them in the boards) — to accept before G16.
// SEO session 13.11.2026: „komputery gamingowe”, Podhale and delivery to all of Poland added
// (the phrases people search for, written once, not stuffed).
export const HOME_TITLE = 'Komputery gamingowe do gier z Rabki-Zdroju | PRO-KOM Gaming'

export const DESCRIPTIONS = {
  home: 'Komputery gamingowe składane w Rabce-Zdroju na Podhalu: 16 zestawów od FullHD do 4K, konfigurator z ceną na żywo i klatki w 33 grach. Wysyłka w całej Polsce.',
  builds:
    '16 komputerów do gier od FullHD do 4K z ceną brutto i klatkami w grach. Wybierz po monitorze i budżecie — od komputera dla dziecka po biały komputer gamingowy.',
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

/**
 * Meta description of a build page: the build's own line plus what a searcher asks — resolution,
 * price, where it is made, warranty. The longest variant that fits `DESCRIPTION_MAX` wins.
 * TODO(krystian): the added sentences are a draft (no copy in the boards) — to accept.
 */
export function buildDescription(why: string, resolution: string, price: number | null): string {
  const priced = price === null ? '' : ` za ${zl(price)}`
  const candidates = [
    `${why} Komputer do gier ${resolution}${priced}, składany w Rabce-Zdroju, z metryką i 24 mies. gwarancji.`,
    `${why} Komputer do gier ${resolution}${priced}, składany w Rabce-Zdroju.`,
    `${why} Komputer do gier ${resolution}${priced}.`,
  ]
  return candidates.find((c) => c.length <= DESCRIPTION_MAX) ?? why
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

/** The year PRO-KOM started (boards OFirmie, Rodzice: „od 2004 roku”). */
export const FOUNDED = '2004'

/**
 * Where the shop serves customers: pickup in Rabka-Zdrój and nearby towns of Podhale, courier to
 * the whole country (spec. §1). Structured data only — no visible copy.
 */
export const AREA_SERVED = [
  { '@type': 'City', name: 'Rabka-Zdrój' },
  { '@type': 'City', name: 'Nowy Targ' },
  { '@type': 'City', name: 'Zakopane' },
  { '@type': 'City', name: 'Kraków' },
  { '@type': 'AdministrativeArea', name: 'powiat nowotarski' },
  { '@type': 'Place', name: 'Podhale' },
  { '@type': 'AdministrativeArea', name: 'województwo małopolskie' },
  { '@type': 'Country', name: 'Polska' },
] as const

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
  const orgId = organizationId(siteUrl)
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
      foundingDate: FOUNDED,
      address: postalAddress,
      areaServed: { '@type': 'Country', name: 'Polska' },
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
      url: new URL(routes.local, siteUrl).toString(),
      image: new URL('/logo-512.png', siteUrl).toString(),
      email: company.email,
      telephone: company.phone,
      foundingDate: FOUNDED,
      address: postalAddress,
      hasMap: shopDirections,
      areaServed: AREA_SERVED,
      currenciesAccepted: 'PLN',
      // Spec. §1: transfer or BLIK after a pro forma invoice — no instalments, no cash on delivery.
      paymentAccepted: 'przelew, BLIK',
      parentOrganization: { '@id': orgId },
      openingHoursSpecification: {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: company.shopHours.days.map((d) => `https://schema.org/${d}`),
        opens: company.shopHours.opens,
        closes: company.shopHours.closes,
      },
      // TODO(krystian): map coordinates (`geo`) of the shop — Google takes them from the
      // Business Profile anyway; a shop photo can then replace the logo in `image`.
    },
  ]
}

/**
 * `WebSite` for the home page — Google takes the site name in search results from it
 * (runda v2 §1.1). Linked to the brand of `organizationJsonLd` by `@id`.
 */
export function websiteJsonLd(siteUrl: string): object {
  const home = new URL(routes.home, siteUrl).toString()
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${home}#witryna`,
    name: SITE_NAME,
    alternateName: `${SITE_NAME} Rabka-Zdrój`,
    url: home,
    inLanguage: 'pl-PL',
    publisher: { '@id': `${home}#organizacja` },
  }
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
  routes.local,
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
  /** ISO date-time of the published prices — the last change of every build page. */
  pricedAt?: string | null
  games: readonly string[]
  guides: readonly string[]
  features: Pick<Features, 'ready' | 'voucher'>
}): MetadataRoute.Sitemap {
  const url = (path: string) => new URL(path, input.siteUrl).toString()
  const plain = (path: string) => ({ url: url(path) })
  const lastModified = input.pricedAt ?? undefined
  return [
    ...STATIC_PAGES.map(plain),
    ...(input.features.ready ? [plain(routes.stock)] : []),
    ...(input.features.voucher ? [plain(routes.voucher)] : []),
    ...input.builds.map((slug) => ({
      url: url(`${routes.builds}/${slug}`),
      ...(lastModified ? { lastModified } : {}),
    })),
    ...input.games.map((slug) => plain(`/komputer-do/${slug}`)),
    ...input.guides.map((slug) => plain(`${routes.guides}/${slug}`)),
  ]
}

/** robots.txt: production lets crawlers in except the panel and the API; elsewhere nothing. */
export function robotsRules(siteUrl: string, siteEnv: string): MetadataRoute.Robots {
  if (!isIndexable(siteEnv)) return { rules: { userAgent: '*', disallow: '/' } }
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/admin', '/api/'] },
    sitemap: new URL('/sitemap.xml', siteUrl).toString(),
  }
}

/** `ItemList` of the builds on `/zestawy`, in the order shown (price order). */
export function buildListJsonLd(
  siteUrl: string,
  builds: readonly { slug: string; name: string }[],
): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Komputery do gier PRO-KOM Gaming',
    numberOfItems: builds.length,
    itemListElement: builds.map((b, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: `Komputer do gier ${b.name}`,
      url: new URL(`${routes.builds}/${b.slug}`, siteUrl).toString(),
    })),
  }
}
