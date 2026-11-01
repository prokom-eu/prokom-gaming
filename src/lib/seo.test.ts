import { describe, expect, it } from 'vitest'

import {
  breadcrumbJsonLd,
  buildTitle,
  isIndexable,
  organizationJsonLd,
  robotsRules,
  sitemapEntries,
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
    expect(JSON.stringify(organizationJsonLd(SITE))).not.toMatch(/Zakopane/)
  })

  it('no empty profile links', () => {
    expect(org).not.toHaveProperty('sameAs')
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
  it('staging: nothing', () => {
    expect(robotsRules(SITE, 'staging')).toEqual({ rules: { userAgent: '*', disallow: '/' } })
  })
})
