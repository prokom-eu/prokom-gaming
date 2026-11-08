import { describe, expect, it } from 'vitest'

import { stampOptionCost, stampPartCosts } from './costStamp'

// The hooks only read `data` and `originalDoc`.
type HookArgs = Parameters<typeof stampPartCosts>[0]
const run = (hook: typeof stampPartCosts, data: object, originalDoc?: object) =>
  hook({ data: structuredClone(data), originalDoc } as unknown as HookArgs) as Record<
    string,
    unknown
  >

describe('stampOptionCost', () => {
  it('stamps only a changed cost', () => {
    expect(run(stampOptionCost, { cost: 100 }, { cost: 100 }).costUpdatedAt).toBeUndefined()
    expect(run(stampOptionCost, { cost: 110 }, { cost: 100 }).costUpdatedAt).toEqual(
      expect.any(String),
    )
  })
})

describe('stampPartCosts', () => {
  const original = {
    components: [
      { id: 'a', role: 'gpu', internalModel: 'RX 9070 XT', partKey: 'gpu-rx-9070-xt', cost: 3000 },
      { id: 'b', role: 'cpu', internalModel: 'Ryzen 7 7800X3D', partKey: 'cpu-x', cost: 1500 },
    ],
  }
  type Out = { components: { costUpdatedAt?: string; partKey?: string }[] }

  it('stamps changed and new parts, keeps others', () => {
    const out = run(
      stampPartCosts,
      {
        components: [
          { ...original.components[0], cost: 3100 },
          original.components[1],
          { role: 'psu', internalModel: 'Zasilacz 850 W', cost: 400 },
        ],
      },
      original,
    ) as unknown as Out
    expect(out.components[0].costUpdatedAt).toEqual(expect.any(String))
    expect(out.components[1].costUpdatedAt).toBeUndefined()
    expect(out.components[2].partKey).toBe('psu-zasilacz-850-w')
  })

  it('keeps a hand-edited key and renews the key of a replaced model', () => {
    const out = run(
      stampPartCosts,
      {
        components: [
          { ...original.components[0], internalModel: 'RX 9070 16 GB' },
          { ...original.components[1], partKey: 'cpu-wlasny' },
        ],
      },
      original,
    ) as unknown as Out
    expect(out.components[0].partKey).toBe('gpu-rx-9070-16-gb')
    expect(out.components[1].partKey).toBe('cpu-wlasny')
  })
})
