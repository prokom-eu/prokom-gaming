import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

/**
 * ADR-G015 (Krystian, 08.11.2026): the strip „Teraz w warsztacie w Rabce” is gone from the whole
 * site and must never come back — no strip, no public feed of orders. This guard reads the site's
 * source, so a copy-paste from git history fails here before it reaches a page.
 */
const root = path.resolve(__dirname, '../..')

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name)
    if (statSync(full).isDirectory()) return sourceFiles(full)
    return /\.(tsx?|css)$/.test(name) && !name.endsWith('.test.ts') ? [full] : []
  })
}

describe('no workshop strip (ADR-G015)', () => {
  const files = [
    ...sourceFiles(path.join(root, 'app')),
    ...sourceFiles(path.join(root, 'components')),
  ]

  it('no page or component says „Teraz w warsztacie”', () => {
    const hits = files.filter((f) => /Teraz w warsztacie/i.test(readFileSync(f, 'utf8')))
    expect(hits.map((f) => path.relative(root, f))).toEqual([])
  })

  it('has no strip component and no public feed of orders', () => {
    expect(existsSync(path.join(root, 'components/home/WorkshopStrip.tsx'))).toBe(false)
    expect(existsSync(path.join(root, 'app/api/warsztat'))).toBe(false)
  })
})
