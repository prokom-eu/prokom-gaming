import { describe, expect, it } from 'vitest'

import expected from '../../tests/fixtures/pricing-expected.json'
import { sellPrices } from './pricing/cost'
import { seedCatalog } from './pricing/testing/seedCatalog'
import {
  isReserved,
  locationOf,
  RESERVATION_MS,
  stockCards,
  stockPrice,
  type StockUnitInput,
} from './stock'

const now = Date.parse('2026-11-20T10:00:00Z')

describe('isReserved', () => {
  it('holds while the date is in the future', () => {
    expect(isReserved(new Date(now + 1000).toISOString(), now)).toBe(true)
    expect(isReserved(new Date(now - 1000).toISOString(), now)).toBe(false)
    expect(isReserved(null, now)).toBe(false)
    expect(isReserved('nie-data', now)).toBe(false)
  })

  it('a reservation lasts 24 hours', () => {
    expect(RESERVATION_MS).toBe(86_400_000)
  })
})

describe('stockPrice', () => {
  it('is the configuration price minus the discount', () => {
    expect(stockPrice(11_930, 500)).toBe(11_430)
    expect(stockPrice(11_930, null)).toBe(11_930)
    expect(stockPrice(11_930, -100)).toBe(11_930)
    expect(stockPrice(1000, 1000)).toBeNull()
  })
})

describe('locationOf', () => {
  it('gives the badge of the board', () => {
    expect(locationOf('zakopane')?.badge).toBe('odbiór od ręki')
    expect(locationOf('x')).toBeUndefined()
  })
})

describe('stockCards', () => {
  const catalog = seedCatalog()
  const offer = {
    levels: catalog.levels,
    options: catalog.options,
    builds: expected.builds.map((b, i) => ({
      id: i + 1,
      slug: b.slug,
      name: b.name,
      config: b.config,
    })),
  }
  const snapshot = {
    ...sellPrices(catalog),
    batch: 1,
    publishedAt: '2026-10-25T10:00:00Z',
    levelFrom: {},
  }
  const wampir = expected.builds.find((b) => b.slug === 'wampir')!
  const builds = [
    {
      slug: 'wampir',
      name: 'Wampir',
      key: 'wampir',
      cpu: 'Procesor 8 rdzeni',
      gpu: 'Karta 16 GB',
      ram: '32 GB DDR5',
      disk: '1 TB NVMe',
      photo: { src: '/media/case.webp', alt: 'Obudowa' },
    },
  ]
  const unit: StockUnitInput = {
    id: 1,
    buildSlug: 'wampir',
    changes: {},
    location: 'rabka',
    conditionNote: 'egzemplarz pokazowy',
    discount: 400,
    reservedUntil: null,
  }
  const cards = (units: StockUnitInput[]) =>
    stockCards({ units, builds, offer, snapshot, optionLabels: { R64: '64 GB DDR5' }, now })

  it('a free unit: build price minus discount, parts and photo of the recipe', () => {
    expect(cards([unit])).toEqual([
      {
        id: 1,
        name: 'Wampir',
        key: 'wampir',
        slug: 'wampir',
        location: 'Rabka-Zdrój',
        badge: 'wysyłka w 1–2 dni robocze',
        specs: 'Procesor 8 rdzeni, Karta 16 GB, 32 GB DDR5, 1 TB NVMe',
        conditionNote: 'egzemplarz pokazowy',
        price: wampir.price - 400,
        photo: { src: '/media/case.webp', alt: 'Obudowa' },
      },
    ])
  })

  it('leaves out reserved, unknown and unpriceable units', () => {
    const reserved = { ...unit, reservedUntil: new Date(now + 60_000).toISOString() }
    expect(
      cards([reserved, { ...unit, buildSlug: 'nie-ma' }, { ...unit, discount: 99_999 }]),
    ).toEqual([])
  })

  it('a changed case drops the recipe photo', () => {
    expect(cards([{ ...unit, changes: { case: wampir.config.case } }])[0]?.photo).toBeNull()
  })
})
