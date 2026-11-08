import { describe, expect, it } from 'vitest'

import pricingExpected from '../../tests/fixtures/pricing-expected.json'
import { buildHero } from './home'
import { budgetBands } from './parents'
import {
  seedBuilds,
  seedFpsTable,
  seedLevels,
  seedOptions,
  seedSnapshot,
} from './testing/offerFromSeed'

const hero = buildHero({
  builds: seedBuilds,
  levels: seedLevels,
  options: seedOptions,
  snapshot: seedSnapshot,
  fps: seedFpsTable,
})
const expectedPrice = new Map(pricingExpected.builds.map((b) => [b.slug, b.price]))

describe('budgetBands („Ile trzeba wydać?”)', () => {
  // Money: every amount is the published price (= the fixtures), never a cost.
  it('gives three bands with the cheapest fitting creatures at their published price', () => {
    const bands = budgetBands(hero.builds)
    expect(bands.map((b) => b.title)).toEqual([
      'Minecraft, Roblox, Fortnite i e-sport',
      'Nowe gry w FullHD na wysokich ustawieniach',
      'Gry na monitorze 2K',
    ])
    for (const band of bands) {
      expect(band.picks.length).toBeGreaterThan(0)
      expect(band.from).toBe(band.picks[0].price)
      for (const pick of band.picks) expect(pick.price).toBe(expectedPrice.get(pick.slug))
      const prices = band.picks.map((p) => p.price)
      expect([...prices].sort((a, b) => a - b)).toEqual(prices)
    }
    // Rising bands: a bigger monitor or newer games cost more.
    expect(bands[0].from).toBeLessThan(bands[1].from)
    expect(bands[1].from).toBeLessThan(bands[2].from)
    expect(bands[0].picks[0].name).toBe('Skrzat')
  })

  it('leaves out a band without a price and never shows a cost', () => {
    const noPrices = hero.builds.map((b) => ({ ...b, price: null }))
    expect(budgetBands(noPrices)).toEqual([])
    expect(JSON.stringify(budgetBands(hero.builds))).not.toMatch(/cost|internalModel|margin/i)
  })
})
