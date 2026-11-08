import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { readCount, readItem, writeItem } from './storage'

function fakeStorage(items: Record<string, string> = {}) {
  return {
    getItem: (key: string) => items[key] ?? null,
    setItem: (key: string, value: string) => {
      items[key] = value
    },
  }
}

describe('storage', () => {
  beforeEach(() => {
    vi.stubGlobal('window', { localStorage: fakeStorage() })
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('writes and reads', () => {
    expect(writeItem('k', 'v')).toBe(true)
    expect(readItem('k')).toBe('v')
  })

  it('counts a JSON array, capped by max', () => {
    writeItem('c', JSON.stringify(['a', 'b', 'c', 'd']))
    expect(readCount('c')).toBe(4)
    expect(readCount('c', 3)).toBe(3)
  })

  it.each([['not json'], ['{"a":1}'], ['"text"']])('treats %s as 0', (raw) => {
    writeItem('c', raw)
    expect(readCount('c')).toBe(0)
  })

  it('returns 0 for a missing key', () => {
    expect(readCount('missing')).toBe(0)
  })

  it('never throws when storage is blocked (private mode, quota)', () => {
    const blocked = {
      getItem: () => {
        throw new Error('SecurityError')
      },
      setItem: () => {
        throw new Error('QuotaExceededError')
      },
    }
    vi.stubGlobal('window', { localStorage: blocked })
    expect(readItem('k')).toBeNull()
    expect(writeItem('k', 'v')).toBe(false)
    expect(readCount('k')).toBe(0)
  })

  it('never throws when localStorage itself is not reachable', () => {
    vi.stubGlobal('window', {
      get localStorage(): Storage {
        throw new Error('SecurityError')
      },
    })
    expect(readItem('k')).toBeNull()
  })
})
