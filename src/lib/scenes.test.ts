import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

import sharp from 'sharp'
import { describe, expect, it } from 'vitest'

// R4: the creature scenes are drawn by scripts/scenes/ (`pnpm generate:scenes`). Every creature
// in the seed needs its three files, or a page shows an empty scene; the card pedestal must be
// kept, or the computer floats on the list.
const root = path.resolve(__dirname, '../..')
const creatures: { id: string }[] = JSON.parse(
  readFileSync(path.join(root, 'seed/prokomgaming/creatures.json'), 'utf8'),
).items

describe('creature scenes', () => {
  it('every creature has a drawn scene', async () => {
    const { SCENES } = (await import('../../scripts/scenes/scenes.mjs')) as {
      SCENES: Record<string, unknown>
    }
    expect(creatures).toHaveLength(16)
    for (const { id } of creatures) expect(SCENES, id).toHaveProperty(id)
  })

  it('every creature has hero, card and foreground files in their sizes, and a pedestal', async () => {
    // The sizes the pages are laid out for (Hero.tsx, Scene.tsx, builds.css).
    const sizes = { hero: [2880, 1067], card: [1680, 960], fg: [2160, 1500] }
    for (const { id } of creatures) {
      for (const [kind, [width, height]] of Object.entries(sizes)) {
        const file = path.join(root, 'public/scenes', `${id}-${kind}.webp`)
        expect(existsSync(file), `${id}-${kind}`).toBe(true)
        const meta = await sharp(file).metadata()
        expect([meta.width, meta.height], `${id}-${kind}`).toEqual([width, height])
      }
      expect(existsSync(path.join(root, 'scripts/scenes/pedestals', `${id}.png`)), id).toBe(true)
    }
  })
})
