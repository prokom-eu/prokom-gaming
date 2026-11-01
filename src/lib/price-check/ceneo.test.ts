import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { ceneoProductId, ceneoUrl, sourceShop } from '../pricing/sources'
import { parseCeneo, shippingDays, titleMatches, trustedOffers } from './ceneo'

const fixture = (name: string) => readFileSync(join(process.cwd(), 'tests/fixtures', name), 'utf8')
const SHOPS = ['x-kom.pl', 'morele.net', 'komputronik.pl', 'sferis.pl']
// Sunday 1.11.2026, the day the pages were saved.
const NOW = new Date('2026-11-01T12:00:00Z')

describe('Ceneo addresses (ADR-G011)', () => {
  it('only a product page counts, kept as one address', () => {
    expect(ceneoProductId('https://www.ceneo.pl/157489814')).toBe('157489814')
    expect(ceneoProductId('https://ceneo.pl/157489814;0284-0.htm')).toBe('157489814')
    expect(ceneoProductId('https://www.ceneo.pl/;szukaj-goodram')).toBeNull()
    expect(ceneoProductId('https://www.ceneo.pl/Pamieci_RAM')).toBeNull()
    expect(ceneoProductId('https://www.ceneo.pl/157489814?e=x')).toBeNull()
    expect(ceneoProductId('http://www.ceneo.pl/157489814')).toBeNull()
    expect(ceneoProductId('https://www.ceneo.pl.evil.com/157489814')).toBeNull()
    expect(ceneoUrl('157489814')).toBe('https://www.ceneo.pl/157489814')
  })

  it('a Ceneo product page is a cost source next to the trusted shops', () => {
    expect(sourceShop('https://www.ceneo.pl/157489814', SHOPS)).toBe('ceneo.pl')
    expect(sourceShop('https://www.x-kom.pl/p/123', SHOPS)).toBe('x-kom.pl')
    expect(sourceShop('https://allegro.pl/oferta/1', SHOPS)).toBeNull()
  })
})

describe('parseCeneo on real pages (1.11.2026)', () => {
  it('reads the title and every offer with shop, price and shipping', () => {
    const page = parseCeneo(fixture('ceneo-ram.html'))
    expect(page.title).toBe(
      'Pamięć RAM GOODRAM IRDM 32GB 2x16GB 6000MHz DDR5 CL30 DIMM (IR6000D564L30S32GDC)',
    )
    // 15 on the page; „Kup na Ceneo” (Ceneo's own basket, no shop address) is left out.
    expect(page.offers).toHaveLength(14)
    expect(page.offers).toContainEqual({
      shop: 'x-kom.pl',
      price: 2559,
      shipping: 'Wysyłka w 1 dzień',
    })
    expect(page.offers).toContainEqual({
      shop: 'morele.net',
      price: 2504.24,
      shipping: 'Wysyłka w 1 dzień',
    })
  })

  it('keeps only trusted shops, one each — marketplaces never set the cost', () => {
    const offers = trustedOffers(parseCeneo(fixture('ceneo-ram.html')), SHOPS, NOW)
    expect(offers).toEqual([
      { shop: 'sferis.pl', price: 2499, available: true },
      { shop: 'morele.net', price: 2504.24, available: true },
      { shop: 'x-kom.pl', price: 2559, available: true },
    ])
  })

  it('the category in the title goes too; a 7-day shipping is not available', () => {
    const page = parseCeneo(fixture('ceneo-gpu.html'))
    expect(page.title).toBe('Sapphire Radeon RX 9070 XT Nitro+ 16GB GDDR6 (GRATIPSAP480)')
    // Amazon is cheapest (4349 zł) but not trusted; Morele ships in up to 7 days.
    expect(trustedOffers(page, SHOPS, NOW)).toEqual([
      { shop: 'morele.net', price: 4926.05, available: false },
    ])
    expect(trustedOffers(page, [...SHOPS, 'amazon.pl'], NOW)[0]).toEqual({
      shop: 'amazon.pl',
      price: 4349,
      available: true,
    })
  })
})

describe('shippingDays', () => {
  it('reads Ceneo shipping lines', () => {
    expect(shippingDays('Wysyłka w 1 dzień', NOW)).toBe(1)
    expect(shippingDays('Wysyłka do 3 dni', NOW)).toBe(3)
    expect(shippingDays('Wysyłka do 7 dni', NOW)).toBe(7)
    expect(shippingDays('Wysyłka czw. 5 lis', NOW)).toBe(4)
    expect(shippingDays('Wysyłka pt. 8 sty', NOW)).toBe(68)
    expect(shippingDays('Darmowa wysyłka', NOW)).toBeNull()
    expect(shippingDays(null, NOW)).toBeNull()
  })
})

describe('titleMatches (a found Ceneo page switches itself on only when it is the product)', () => {
  it('the same model, written the Ceneo way', () => {
    expect(
      titleMatches(
        'GOODRAM IRDM DDR5 32 GB (2x16) 6000',
        'Pamięć RAM GOODRAM IRDM 32GB 2x16GB 6000MHz DDR5 CL30 DIMM (IR6000D564L30S32GDC)',
      ),
    ).toBe(true)
    expect(
      titleMatches(
        'Corsair FRAME 4000D RS ARGB czarna (CC-9011296-WW)',
        'Corsair FRAME 4000D RS ARGB Czarny (CC-9011296-WW)',
      ),
    ).toBe(true)
    expect(titleMatches('Gigabyte X870 EAGLE WIFI7', 'Gigabyte X870 EAGLE WIFI 7')).toBe(true)
  })

  it('another variant or another model is not the product', () => {
    expect(
      titleMatches('MSI GeForce RTX 5070 16G', 'MSI GeForce RTX 5070 Ti 16G GAMING TRIO OC'),
    ).toBe(false)
    expect(
      titleMatches(
        'Arctic Liquid Freezer III Pro 360 A-RGB',
        'Arctic Liquid Freezer III Pro 360 A-RGB White',
      ),
    ).toBe(false)
    expect(
      titleMatches(
        'Arctic Liquid Freezer III Pro 360 A-RGB White',
        'Arctic Liquid Freezer III Pro 360 A-RGB White',
      ),
    ).toBe(true)
    expect(
      titleMatches('AMD Ryzen 7 9800X3D Tray', 'AMD Ryzen 7 9800X3D, 4.7 GHz, 96 MB, BOX'),
    ).toBe(false)
    expect(
      titleMatches('AMD Ryzen 7 9800X3D Tray', 'AMD Ryzen 7 9800X3D, 4.7 GHz, 96 MB, OEM'),
    ).toBe(true)
    expect(
      titleMatches('GOODRAM IRDM DDR5 64 GB (2x32) 6000', 'GOODRAM IRDM 32GB 2x16GB 6000MHz DDR5'),
    ).toBe(false)
    expect(titleMatches('Endorfy Fera 5', null)).toBe(false)
  })
})

describe('review of the Ceneo source', () => {
  it('a mark is a whole word: a suffixed model is another product (14400F, 7600X, 7900XTX)', () => {
    expect(
      titleMatches('Intel Core i5-14400 Tray', 'Intel Core i5-14400F, 2.5 GHz, 20 MB, OEM'),
    ).toBe(false)
    expect(
      titleMatches('Intel Core i5-14400F Tray', 'Intel Core i5-14400F, 2.5 GHz, 20 MB, OEM'),
    ).toBe(true)
    expect(titleMatches('AMD Ryzen 5 7600 Tray', 'AMD Ryzen 5 7600X, 4.7 GHz, 32 MB, OEM')).toBe(
      false,
    )
    expect(titleMatches('Sapphire RX 7900XT', 'Sapphire Radeon RX 7900XTX Pulse 24GB')).toBe(false)
    expect(titleMatches('MSI RTX 5070 VENTUS', 'MSI GeForce RTX 5070Ti VENTUS 16GB')).toBe(false)
    // A unit may follow: 16G → 16GB, 750 → 750W, 360 → 360mm.
    expect(
      titleMatches(
        'MSI GeForce RTX 5080 16G VENTUS 3X OC',
        'MSI GeForce RTX 5080 VENTUS 3X OC 16GB GDDR7',
      ),
    ).toBe(true)
    expect(titleMatches('Endorfy Vero L6 750 W', 'Endorfy Vero L6 750W (EY7A008)')).toBe(true)
  })

  it('today is the Polish date, also just after midnight', () => {
    // 2.11.2026 00:30 in Warsaw is still 1.11 in UTC.
    expect(shippingDays('Wysyłka czw. 5 lis', new Date('2026-11-01T23:30:00Z'))).toBe(3)
  })

  it('a Ceneo page sent elsewhere (moved product, category) is not read', async () => {
    const { fetchCeneoPage } = await import('./ceneo')
    const original = globalThis.fetch
    const answer = (url: string) =>
      // `url` is a getter of Response: defined on the instance.
      Object.defineProperty(
        new Response('<title>x</title>', { headers: { 'content-type': 'text/html' } }),
        'url',
        { value: url },
      )
    try {
      globalThis.fetch = (async () => answer('https://www.ceneo.pl/999')) as typeof fetch
      expect(await fetchCeneoPage('https://www.ceneo.pl/157489814', 'https://x.pl')).toBeNull()
      globalThis.fetch = (async () => answer('https://www.ceneo.pl/157489814')) as typeof fetch
      expect(await fetchCeneoPage('https://www.ceneo.pl/157489814', 'https://x.pl')).toBe(
        '<title>x</title>',
      )
    } finally {
      globalThis.fetch = original
    }
  })

  it('Ceneo and marketplaces are never a trusted shop, even if saved in the settings', async () => {
    const { shopsOf } = await import('../../globals/PriceCheckSettings')
    expect(
      shopsOf({
        shops: [{ domain: 'x-kom.pl' }, { domain: 'ceneo.pl' }, { domain: 'allegro.pl' }],
      }),
    ).toEqual(['x-kom.pl'])
  })
})
