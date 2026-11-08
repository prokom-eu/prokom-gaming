import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

/**
 * ADR-G015 (Krystian, 08.11.2026): the strip „Teraz w warsztacie w Rabce” is gone from the whole
 * site and must never come back — no strip, no switch for it, no public feed or page of orders.
 * This guard reads the source, so a copy-paste from git history fails here before it ships.
 */
const root = path.resolve(__dirname, '../..')

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name)
    if (statSync(full).isDirectory()) return sourceFiles(full)
    return /\.(tsx?|css)$/.test(name) && !name.endsWith('.test.ts') ? [full] : []
  })
}

/** The strip's text, its component, its panel switch and its public endpoint. */
const STRIP = /Teraz w warsztacie|WorkshopStrip|workshopStrip|\/api\/warsztat/i

describe('no workshop strip (ADR-G015)', () => {
  const files = ['app', 'components', 'lib', 'globals', 'admin', 'collections'].flatMap((dir) =>
    sourceFiles(path.join(root, dir)),
  )

  it('no source file brings the strip, its switch or its feed back', () => {
    const hits = files.filter((f) => STRIP.test(readFileSync(f, 'utf8')))
    expect(hits.map((f) => path.relative(root, f))).toEqual([])
  })

  it('has no strip component, no public feed and no public page of orders', () => {
    expect(existsSync(path.join(root, 'components/home/WorkshopStrip.tsx'))).toBe(false)
    expect(existsSync(path.join(root, 'app/api/warsztat'))).toBe(false)
    expect(existsSync(path.join(root, 'app/(site)/warsztat'))).toBe(false)
  })
})
