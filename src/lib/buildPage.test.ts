import { describe, expect, it } from 'vitest'

import pricingExpected from '../../tests/fixtures/pricing-expected.json'
import {
  buildCode,
  buildJsonLd,
  inquiryHref,
  interiorParts,
  monitorFit,
  neighbours,
  ownLight,
  prevNext,
  tuneChoices,
  tunedNote,
  tunedPrice,
  type InteriorInput,
} from './buildPage'
import { buildFpsTable } from './fps'
import { buildHero } from './home'
import { zl } from './pricing/format'
import { seedCatalog } from './pricing/testing/seedCatalog'
import {
  seedBuilds,
  seedFpsTable,
  seedLevels,
  seedOptions,
  seedSnapshot,
} from './testing/offerFromSeed'

const catalog = seedCatalog()
const offer = { levels: catalog.levels, options: catalog.options }
const configOf = (slug: string) => pricingExpected.builds.find((b) => b.slug === slug)!.config
const hero = buildHero({
  builds: seedBuilds,
  levels: seedLevels,
  options: seedOptions,
  snapshot: seedSnapshot,
  fps: seedFpsTable,
})
const short = (slot: 'ram' | 'ssd', slug: string) =>
  tuneChoices(slot, configOf(slug), offer, seedSnapshot).map((c) => [c.code, c.surcharge])

describe('Dopasuj: RAM and SSD choices (= board Zestaw JS, prices from the published batch)', () => {
  // Money: the same lists and surcharges as the board, which come from the pricing sheet.
  it('Wampir: 32 / 64 GB and 1 / 2 TB', () => {
    expect(short('ram', 'wampir')).toEqual([
      ['R32', 0],
      ['R64', 3190],
    ])
    expect(short('ssd', 'wampir')).toEqual([
      ['NM1', 0],
      ['NM2', 610],
    ])
  })

  it('Skrzat: DDR4 only; the cheapest 1 TB', () => {
    expect(short('ram', 'skrzat')).toEqual([
      ['R16D4', 0],
      ['R32D4', 410],
    ])
    expect(short('ssd', 'skrzat')).toEqual([
      ['PXL512', 0],
      ['PX1', 290],
      ['NM2', 1130],
    ])
  })

  it('Licho and Żmij: a smaller disk is a negative surcharge', () => {
    expect(short('ssd', 'licho')).toEqual([
      ['PXL512', -290],
      ['PX1', 0],
      ['NM2', 840],
    ])
    expect(short('ssd', 'zmij')).toEqual([
      ['PX1', -840],
      ['NM2', 0],
    ])
    expect(short('ram', 'zmij')).toEqual([
      ['R32RGB', 0],
      ['R64', 3100],
    ])
  })

  it('Perun: nothing to change', () => {
    expect(short('ram', 'perun')).toEqual([['R64', 0]])
    expect(short('ssd', 'perun')).toEqual([['NM2', 0]])
  })

  it('never offers an inactive option or one without a price', () => {
    const inactive = {
      ...offer,
      options: offer.options.map((o) => (o.code === 'R64' ? { ...o, active: false } : o)),
    }
    expect(
      tuneChoices('ram', configOf('wampir'), inactive, seedSnapshot).map((c) => c.code),
    ).toEqual(['R32'])
    const unpriced = { ...seedSnapshot, option: { ...seedSnapshot.option } }
    delete unpriced.option.NM2
    expect(tuneChoices('ssd', configOf('wampir'), offer, unpriced).map((c) => c.code)).toEqual([
      'NM1',
    ])
  })

  it('every tuned price of every build = its own price + the surcharges', () => {
    for (const build of pricingExpected.builds) {
      expect(tunedPrice(build.config, { ...build.config, light: null }, seedSnapshot)).toBe(
        build.price,
      )
      for (const ram of tuneChoices('ram', build.config, offer, seedSnapshot)) {
        for (const ssd of tuneChoices('ssd', build.config, offer, seedSnapshot)) {
          const price = tunedPrice(
            build.config,
            { ram: ram.code, ssd: ssd.code, light: null },
            seedSnapshot,
          )
          expect(price, `${build.slug} ${ram.code} ${ssd.code}`).toBe(
            build.price + ram.surcharge + ssd.surcharge,
          )
        }
      }
    }
  })

  it('writes the note under the price like the board', () => {
    expect(tunedNote(3190, null, zl)).toBe(
      `Różnica +${zl(3190)} względem zestawu. Liczymy tak samo jak konfigurator.`,
    )
    expect(tunedNote(-840, 'lod', zl)).toBe(
      'Różnica −840 zł względem zestawu. Liczymy tak samo jak konfigurator.',
    )
    expect(tunedNote(0, 'lod', zl)).toBe('Kolor światła bez dopłaty.')
    expect(tunedNote(0, null, zl)).toBe('Wersja jak na zdjęciu.')
    expect(ownLight('czarna, czerwone światło')).toBe('czerwone światło')
  })

  it('passes only what changed to the inquiry', () => {
    const config = configOf('wampir')
    expect(inquiryHref('wampir', config)).toBe('/zapytanie?zestaw=wampir')
    expect(inquiryHref('wampir', config, { ram: 'R32', ssd: 'NM1', light: null })).toBe(
      '/zapytanie?zestaw=wampir',
    )
    expect(inquiryHref('wampir', config, { ram: 'R64', ssd: 'NM2', light: 'lod' })).toBe(
      '/zapytanie?zestaw=wampir&ram=R64&ssd=NM2&swiatlo=lod',
    )
  })
})

describe('Na jaki monitor (board `mon`)', () => {
  const row = (game: string, resolution: 'fullhd' | 'qhd' | 'uhd', fps: number) => ({
    build: 'x',
    game,
    resolution,
    fps,
    kind: 'm' as const,
    sourceLabel: 'test',
    sourceUrl: null,
    setting: 'wysokie',
    measuredAt: null,
  })
  const games = ['cyberpunk-2077', 'black-myth-wukong', 'assassins-creed-shadows', 'wiedzmin-3']

  it('rates by the average of four heavy games', () => {
    const table = buildFpsTable([
      ...games.map((g) => row(g, 'fullhd', 95)),
      ...games.map((g) => row(g, 'qhd', 60)),
      ...games.map((g, i) => row(g, 'uhd', i === 0 ? 50 : 44)),
    ])
    expect(monitorFit(table, 'x').map((m) => [m.label, m.verdict, m.ok])).toEqual([
      ['FullHD', 'bez kompromisów', true],
      ['2K', 'płynnie', true],
      ['4K', 'da radę', false],
    ])
  })

  it('skips a resolution without all four numbers', () => {
    const table = buildFpsTable(games.slice(0, 3).map((g) => row(g, 'qhd', 120)))
    expect(monitorFit(table, 'x')).toEqual([])
  })

  it('works on the seed data for every build', () => {
    for (const build of pricingExpected.builds) {
      expect(monitorFit(seedFpsTable, build.slug).length, build.slug).toBeGreaterThan(0)
    }
  })
})

describe('Co jest w środku (board `PD`)', () => {
  const base: InteriorInput = {
    cpu: 'Ryzen 7 9800X3D',
    gpu: 'RTX 5070 Ti 16 GB',
    motherboard: 'płyta B850 Wi-Fi 6E',
    psu: 'zasilacz 850 W 80+ Gold ATX 3.1, modularny',
    ram: '32 GB DDR5 6000 CL30 (2x16)',
    ssd: '1 TB NVMe PCIe 4.0, szybki (do 7 400 MB/s)',
    cooler: 'be quiet! Pure Loop 3 LX 360 mm',
    coolerKind: 'aio360',
    case: 'be quiet! Light Base 500 LX czarna',
    platform: 'AM5',
    resolution: 'uhd',
  }

  it('has eight parts in board order with the Wampir texts', () => {
    const parts = interiorParts(base)
    expect(parts.map((p) => p.title)).toEqual([
      'Karta graficzna',
      'Procesor',
      'Chłodzenie',
      'Pamięć RAM',
      'Dysk',
      'Płyta główna',
      'Zasilacz',
      'Obudowa i wentylatory',
    ])
    expect(parts[0]).toMatchObject({
      value: 'RTX 5070 Ti 16 GB',
      why: '16 GB pamięci karty. Najważniejsza część dla klatek: to ona rysuje każdą scenę na monitorze 4K.',
      short: '16 GB pamięci karty.',
      minimum:
        'karta nowej generacji z min. 16 GB pamięci, chłodzenie z dwoma albo trzema wentylatorami',
    })
    expect(parts[1]!.why).toMatch(/^Wersja X3D/)
    expect(parts[1]!.minimum).toBe('platforma AM5: w przyszłości wymienisz sam procesor')
    expect(parts[2]!.minimum).toBe('AIO 360 mm od sprawdzonego producenta')
  })

  it('switches the texts for Intel, AM4 and air cooling', () => {
    const intel = interiorParts({
      ...base,
      cpu: 'Core i5-14400F',
      platform: 'LGA1700',
      coolerKind: 'air',
    })
    expect(intel[1]!.why).toMatch(/^Dużo rdzeni/)
    expect(intel[1]!.minimum).toBe('platforma Intel z aktualnym chipsetem')
    expect(intel[2]!.why).toMatch(/^Duże chłodzenie wieżowe/)
    const am4 = interiorParts({ ...base, cpu: 'Ryzen 5 5500', platform: 'AM4' })
    expect(am4[1]!.why).toMatch(/^Nowoczesny procesor/)
    expect(am4[1]!.minimum).toBe('platforma AM4, sprawdzona i tania w rozbudowie')
  })
})

describe('neighbours and the switcher', () => {
  const names = (list: { name: string }[]) => list.map((b) => b.name)

  it('same tier or one up, at most three (board: Wampir → Wilkołak, Weles, Żmij)', () => {
    expect(names(neighbours(hero.builds, 'wampir'))).toEqual(['Wilkołak', 'Weles', 'Żmij'])
    expect(names(neighbours(hero.builds, 'skrzat'))).toEqual(['Licho'])
  })

  it('the top tier shows the tier below', () => {
    expect(names(neighbours(hero.builds, 'perun'))).toEqual(['Weles', 'Żmij'])
  })

  it('counts and wraps in level order („13 z 16 istot”)', () => {
    const wampir = prevNext(hero.builds, 'wampir')!
    expect([wampir.position, wampir.total, wampir.prev.name, wampir.next.name]).toEqual([
      13,
      16,
      'Wilkołak',
      'Weles',
    ])
    const skrzat = prevNext(hero.builds, 'skrzat')!
    expect([skrzat.prev.name, skrzat.next.name]).toEqual(['Perun', 'Licho'])
    expect(prevNext(hero.builds, 'nie-ma')).toBeNull()
    expect(buildCode('wampir', 7)).toBe('WAM-7')
  })
})

describe('structured data', () => {
  const ld = buildJsonLd({
    siteUrl: 'https://prokomgaming.pl',
    slug: 'wampir',
    name: 'Wampir',
    description: 'Nie śpi w nocy i nie zwalnia.',
    image: '/api/media/file/LB500.webp',
    price: 14540,
    pricedAt: '2026-10-25T10:00:00.000Z',
    faq: [{ question: 'Jak długo czekam na komputer?', answer: 'Od 5 do 10 dni roboczych.' }],
  }) as Record<string, unknown>[]

  it('has Product + Offer with the price valid 7 days, breadcrumbs and FAQ', () => {
    expect(ld.map((x) => x['@type'])).toEqual(['Product', 'BreadcrumbList', 'FAQPage'])
    expect(ld[0]).toMatchObject({
      name: 'Komputer do gier Wampir',
      image: 'https://prokomgaming.pl/api/media/file/LB500.webp',
      offers: {
        price: 14540,
        priceCurrency: 'PLN',
        priceValidUntil: '2026-11-01',
        availability: 'https://schema.org/MadeToOrder',
        url: 'https://prokomgaming.pl/zestawy/wampir',
      },
    })
    expect(JSON.stringify(ld)).not.toMatch(/cost|internalModel/)
  })

  it('has no offer without a published price', () => {
    const [product] = buildJsonLd({
      siteUrl: 'https://prokomgaming.pl',
      slug: 'wampir',
      name: 'Wampir',
      description: 'x',
      image: null,
      price: null,
      pricedAt: null,
      faq: [],
    }) as Record<string, unknown>[]
    expect(product).not.toHaveProperty('offers')
    expect(product).not.toHaveProperty('image')
  })
})
