import { describe, expect, it } from 'vitest'

import expected from '../../../tests/fixtures/pricing-expected.json'
import { costContext } from './cost'
import { checkStockUnit } from './stock'
import { seedCatalog } from './testing/seedCatalog'
import type { Config } from './types'

const ctx = costContext(seedCatalog())
const bazyliszek = expected.builds.find((b) => b.name === 'Bazyliszek')!
const config = bazyliszek.config as Config

describe('checkStockUnit (margin guard of a unit)', () => {
  it('without a discount: the build price', () => {
    expect(checkStockUnit({ config, discount: 0 }, ctx)).toMatchObject({
      ok: true,
      price: bazyliszek.price,
    })
  })

  it('a small discount passes, a big one is blocked at the minimum margin', () => {
    expect(checkStockUnit({ config, discount: 200 }, ctx)).toMatchObject({
      ok: true,
      price: bazyliszek.price - 200,
    })
    const blocked = checkStockUnit({ config, discount: 3000 }, ctx)
    expect(blocked).toMatchObject({ ok: false, path: 'discount' })
    if (!blocked.ok) expect(blocked.message).toMatch(/minimum 11,0%/)
  })

  it('a discount equal to the price and unknown codes are refused', () => {
    expect(checkStockUnit({ config, discount: bazyliszek.price }, ctx)).toMatchObject({
      ok: false,
      path: 'discount',
    })
    expect(checkStockUnit({ config: { ...config, ram: 'NIE' }, discount: 0 }, ctx)).toMatchObject({
      ok: false,
      path: 'config',
    })
  })
})
