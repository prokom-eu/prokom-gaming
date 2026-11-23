import { readdirSync, readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

describe('IndexNow key file (prokom-web ADR-030)', () => {
  it('public/<key>.txt holds exactly its own name — the key shared by every PRO-KOM domain', () => {
    const files = readdirSync('public').filter((f) => /^[0-9a-f]{32}\.txt$/.test(f))
    expect(files).toEqual(['1a909fcf3fdf8b994d75221027393cf8.txt'])
    expect(readFileSync(`public/${files[0]}`, 'utf8')).toBe(files[0]!.replace('.txt', ''))
  })
})
