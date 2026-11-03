import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { BUILD_ACCENTS, MAIL_COLORS } from './layout'

/** The mail copies colours from tokens.css (no CSS variables in mail) — they must not drift. */
const tokens = readFileSync(join(process.cwd(), 'src/styles/tokens.css'), 'utf8')
const token = (name: string) =>
  new RegExp(`--${name}:\\s*(#[0-9a-f]{6})`, 'i').exec(tokens)?.[1]?.toLowerCase()

describe('mail colours = tokens.css', () => {
  it.each([
    ['page', 'smola'],
    ['tag', 'noc'],
    ['foot', 'foot'],
    ['text', 'kosc'],
    ['text2', 'kosc2'],
    ['muted', 'mgla'],
    ['gold', 'grom'],
    ['gold2', 'grom2'],
  ] as const)('%s = --%s', (key, name) => {
    expect(MAIL_COLORS[key].toLowerCase()).toBe(token(name))
  })

  it('every build accent = its --c-<build>', () => {
    for (const [name, color] of Object.entries(BUILD_ACCENTS)) {
      expect(color.toLowerCase(), name).toBe(token(`c-${name.replace(/ /g, '-')}`))
    }
  })
})
