import { describe, expect, it } from 'vitest'

import buildsSeed from '../../seed/prokomgaming/builds.json'
import { HIGHLIGHT_BODY_MAX, HIGHLIGHT_TITLE_MAX } from '../collections/Builds'

import { HIGHLIGHTS } from '../migrations/20261104_211926_r2_highlight'

describe('migration r2_highlight', () => {
  it('fills the same „Wyróżnik” texts as the seed, for all 16 builds', () => {
    const fromSeed = Object.fromEntries(buildsSeed.items.map((b) => [b.slug, b.highlight]))
    expect(HIGHLIGHTS).toEqual(fromSeed)
    expect(Object.keys(HIGHLIGHTS)).toHaveLength(16)
  })

  it('every text fits the field limits (the panel would refuse to save it)', () => {
    for (const [slug, { title, body }] of Object.entries(HIGHLIGHTS)) {
      expect([...title].length, slug).toBeLessThanOrEqual(HIGHLIGHT_TITLE_MAX)
      expect([...body].length, slug).toBeLessThanOrEqual(HIGHLIGHT_BODY_MAX)
    }
  })
})
