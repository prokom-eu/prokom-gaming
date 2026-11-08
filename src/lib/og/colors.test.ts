import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { OG_COLOR_TOKENS, OG_COLORS } from './colors'

/** The previews copy colours from tokens.css (no CSS variables in Satori) — they must not drift. */
const tokens = readFileSync(join(process.cwd(), 'src/styles/tokens.css'), 'utf8')
const token = (name: string) =>
  new RegExp(`--${name}:\\s*(#[0-9a-f]{6})`, 'i').exec(tokens)?.[1]?.toLowerCase()

describe('link preview colours = tokens.css', () => {
  it.each(Object.entries(OG_COLOR_TOKENS))('%s = --%s', (key, name) => {
    expect(OG_COLORS[key as keyof typeof OG_COLORS]).toBe(token(name))
  })
})
