import { describe, expect, it } from 'vitest'

import { matchesAll, partHits } from './match'

describe('panel search: parts (P8)', () => {
  const levels = [
    {
      id: 4,
      code: 'MOC-IV',
      tierRoman: 'IV',
      components: [
        {
          role: 'gpu',
          publicLabel: 'Karta klasy RTX 5060 Ti',
          internalModel: 'Gigabyte RTX 5060 Ti 16G',
        },
        { role: 'ram', publicLabel: '32 GB DDR5', internalModel: 'Kingston Fury 32GB DDR5-6000' },
      ],
    },
    {
      id: 5,
      code: 'MOC-V',
      tierRoman: 'V',
      components: [
        { role: 'ram', publicLabel: '32 GB DDR5', internalModel: 'Kingston Fury 32GB DDR5-6000' },
      ],
    },
  ]

  it('finds every word, in any case', () => {
    expect(matchesAll('Kingston Fury 32GB DDR5-6000', 'fury ddr5')).toBe(true)
    expect(matchesAll('Kingston Fury 32GB DDR5-6000', 'fury ddr4')).toBe(false)
  })

  it('one hit per model, with the levels that use it', () => {
    expect(partHits(levels, 'kingston')).toEqual([
      { levelId: 4, label: 'Kingston Fury 32GB DDR5-6000', detail: 'Moc IV, Moc V' },
    ])
    // A level found by the database for another part does not add non-matching parts.
    expect(partHits(levels, '5060').map((h) => h.label)).toEqual(['Gigabyte RTX 5060 Ti 16G'])
  })
})
