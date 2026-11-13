import { describe, expect, it } from 'vitest'

import {
  AREA_SERVED,
  breadcrumbJsonLd,
  buildDescription,
  buildListJsonLd,
  buildTitle,
  DESCRIPTION_MAX,
  DESCRIPTIONS,
  HOME_TITLE,
  TITLE_MAX,
  isIndexable,
  organizationJsonLd,
  robotsRules,
  sitemapEntries,
  websiteJsonLd,
} from './seo'

const SITE = 'https://prokomgaming.pl'

describe('buildTitle (spec. §23)', () => {
  it('name, resolution and price in the spec template', () => {
    expect(buildTitle('Wampir', '2K', 8490)).toBe(
      // zl() groups thousands with a no-break space.
      'Wampir — komputer do gier 2K, 8 490 zł | PRO-KOM Gaming',
    )
  })
  it('without a published price, no price part', () => {
    expect(buildTitle('Wampir', '2K', null)).toBe('Wampir — komputer do gier 2K | PRO-KOM Gaming')
  })
})

describe('isIndexable', () => {
  it('only production', () => {
    expect(isIndexable('production')).toBe(true)
    expect(isIndexable('staging')).toBe(false)
    expect(isIndexable('local')).toBe(false)
  })
})

describe('breadcrumbJsonLd', () => {
  it('starts at the home page and numbers the crumbs', () => {
    expect(breadcrumbJsonLd(SITE, [{ name: 'Poradniki', path: '/poradniki' }])).toEqual({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Strona główna', item: `${SITE}/` },
        { '@type': 'ListItem', position: 2, name: 'Poradniki', item: `${SITE}/poradniki` },
      ],
    })
  })
})

describe('organizationJsonLd', () => {
  const [org, store] = organizationJsonLd(SITE) as Record<string, unknown>[]

  it('the brand with the seller behind it', () => {
    expect(org).toMatchObject({
      '@type': 'Organization',
      name: 'PRO-KOM Gaming',
      legalName: 'PRO-KOM Tadeusz Wójciak',
      vatID: 'PL7352511447',
      telephone: '+48 883 200 151',
      email: 'kontakt@prokomgaming.pl',
      parentOrganization: { url: 'https://pro-kom.eu' },
    })
  })

  it('one shop, in Rabka-Zdrój, tied to the organisation', () => {
    expect(store).toMatchObject({
      '@type': 'ComputerStore',
      address: {
        streetAddress: 'ul. Orkana 16B',
        postalCode: '34-700',
        addressLocality: 'Rabka-Zdrój',
      },
      parentOrganization: { '@id': org?.['@id'] },
    })
    // No salon in Zakopane (Krystian, 01.11.2026): the only address is Rabka-Zdrój.
    expect(JSON.stringify(store?.address)).not.toMatch(/Zakopane/)
    expect(JSON.stringify(org?.address)).not.toMatch(/Zakopane/)
  })

  it('the shop serves Podhale and Małopolska and ships to all of Poland (local SEO)', () => {
    expect(store).toMatchObject({
      areaServed: AREA_SERVED,
      foundingDate: '2004',
      currenciesAccepted: 'PLN',
      hasMap: expect.stringMatching(/^https:\/\/www\.google\.com\/maps\//),
      image: `${SITE}/logo-512.png`,
    })
    const names = AREA_SERVED.map((a) => a.name)
    expect(names).toEqual(
      expect.arrayContaining([
        'Rabka-Zdrój',
        'Nowy Targ',
        'Podhale',
        'województwo małopolskie',
        'Polska',
      ]),
    )
    expect(org).toMatchObject({ foundingDate: '2004', areaServed: { name: 'Polska' } })
  })

  it('no instalments among the payments', () => {
    expect(String(store?.paymentAccepted)).not.toMatch(/rat/)
  })

  it('no empty profile links', () => {
    expect(org).not.toHaveProperty('sameAs')
  })
})

describe('titles and descriptions fit search results', () => {
  it('home: „komputery gamingowe” and Rabka in the title, Podhale in the description', () => {
    expect(HOME_TITLE.length).toBeLessThanOrEqual(TITLE_MAX)
    expect(HOME_TITLE).toMatch(/gamingowe/)
    expect(HOME_TITLE).toMatch(/Rabki-Zdroju/)
    expect(DESCRIPTIONS.home).toMatch(/Podhalu/)
    for (const d of Object.values(DESCRIPTIONS))
      expect(d.length).toBeLessThanOrEqual(DESCRIPTION_MAX)
  })

  it('build description: the longest variant that fits', () => {
    expect(buildDescription('Nie śpi w nocy.', '2K', 14540)).toMatch(
      /^Nie śpi w nocy\. Komputer do gier 2K za 14\s540 zł, składany w Rabce-Zdroju, z metryką i 24 mies\. gwarancji\.$/,
    )
    const long = 'x'.repeat(120)
    expect(buildDescription(long, '4K', 30000).length).toBeLessThanOrEqual(DESCRIPTION_MAX)
    expect(buildDescription(long, '4K', null)).toBe(`${long} Komputer do gier 4K.`)
    expect(buildDescription('y'.repeat(170), '4K', null)).toBe('y'.repeat(170))
  })
})

describe('buildListJsonLd', () => {
  it('builds in the order shown, with absolute addresses', () => {
    expect(
      buildListJsonLd(SITE, [
        { slug: 'skrzat', name: 'Skrzat' },
        { slug: 'licho', name: 'Licho' },
      ]),
    ).toMatchObject({
      '@type': 'ItemList',
      numberOfItems: 2,
      itemListElement: [
        { position: 1, name: 'Komputer do gier Skrzat', url: `${SITE}/zestawy/skrzat` },
        { position: 2, name: 'Komputer do gier Licho', url: `${SITE}/zestawy/licho` },
      ],
    })
  })
})

describe('sitemapEntries (spec. §23)', () => {
  const entries = (features = { ready: false, voucher: false }) =>
    sitemapEntries({
      siteUrl: SITE,
      builds: ['wampir'],
      games: ['cyberpunk-2077'],
      guides: ['rodzice'],
      features,
    }).map((e) => e.url)

  it('fixed pages, builds, games and guides as absolute addresses', () => {
    const urls = entries()
    expect(urls).toContain(`${SITE}/`)
    expect(urls).toContain(`${SITE}/zestawy/wampir`)
    expect(urls).toContain(`${SITE}/komputer-do/cyberpunk-2077`)
    expect(urls).toContain(`${SITE}/poradniki/rodzice`)
    expect(urls).toContain(`${SITE}/komputery-do-gier-rabka-zdroj`)
  })

  it('build pages carry the date of the published prices', () => {
    const list = sitemapEntries({
      siteUrl: SITE,
      builds: ['wampir'],
      pricedAt: '2026-11-10T08:00:00.000Z',
      games: [],
      guides: [],
      features: { ready: false, voucher: false },
    })
    expect(list.find((e) => e.url === `${SITE}/zestawy/wampir`)?.lastModified).toBe(
      '2026-11-10T08:00:00.000Z',
    )
    expect(list.find((e) => e.url === `${SITE}/`)).not.toHaveProperty('lastModified')
  })

  it('never private pages; hidden sale pages only when switched on', () => {
    const urls = entries()
    for (const path of ['/metryka', '/konto', '/zapytanie', '/gotowe', '/bon']) {
      expect(urls).not.toContain(`${SITE}${path}`)
    }
    expect(entries({ ready: true, voucher: true })).toEqual(
      expect.arrayContaining([`${SITE}/gotowe`, `${SITE}/bon`]),
    )
  })
})

describe('robotsRules', () => {
  it('production: everything but the panel and the API, with the sitemap', () => {
    expect(robotsRules(SITE, 'production')).toEqual({
      rules: { userAgent: '*', allow: '/', disallow: ['/admin', '/api/'] },
      sitemap: `${SITE}/sitemap.xml`,
    })
  })
  it('AI assistants crawlers (GPTBot, ClaudeBot, PerplexityBot, Google-Extended) are let in', () => {
    // One rule for every crawler: no bot-specific block may creep in (SEO session 13.11.2026).
    const { rules } = robotsRules(SITE, 'production')
    expect(Array.isArray(rules)).toBe(false)
    expect(rules).toMatchObject({ userAgent: '*', allow: '/' })
  })
  it('staging: nothing', () => {
    expect(robotsRules(SITE, 'staging')).toEqual({ rules: { userAgent: '*', disallow: '/' } })
  })
})

describe('websiteJsonLd (runda v2 §1.1)', () => {
  it('the site name Google shows, linked to the brand', () => {
    expect(websiteJsonLd(SITE)).toMatchObject({
      '@type': 'WebSite',
      name: 'PRO-KOM Gaming',
      alternateName: 'PRO-KOM Gaming Rabka-Zdrój',
      url: 'https://prokomgaming.pl/',
      publisher: { '@id': 'https://prokomgaming.pl/#organizacja' },
    })
  })
})
