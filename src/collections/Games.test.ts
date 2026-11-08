import { describe, expect, it } from 'vitest'

import gamesSeed from '../../seed/prokomgaming/games.json'
import { slugText } from './Games'

type Options = Parameters<typeof slugText>[1]
const options = {
  req: { payload: { config: {} }, t: (k: string) => k },
  required: true,
} as unknown as Options
const check = (value: string) => slugText(value, options)
const MESSAGE = 'Tylko małe litery bez polskich znaków, cyfry i pojedyncze myślniki, np. „gta-v”.'

describe('slugText — game address /komputer-do/<slug>', () => {
  it('accepts all 33 slugs from the seed', async () => {
    for (const { slug } of gamesSeed.items) expect(await check(slug), slug).toBe(true)
  })

  it('refuses spaces, capitals, Polish letters and stray hyphens', async () => {
    for (const value of ['gta v', 'GTA-V', 'wiedźmin-3', '-gta', 'gta--v', 'gta-', 'gta/v']) {
      expect(await check(value), value).toBe(MESSAGE)
    }
  })
})
