import { describe, expect, it } from 'vitest'

import { partKey } from './partKey'
import { shopOf } from './sources'

describe('partKey', () => {
  it('is the same for the same model regardless of case and punctuation', () => {
    expect(partKey('gpu', 'Radeon RX 9070 XT 16 GB')).toBe('gpu-radeon-rx-9070-xt-16-gb')
    expect(partKey('gpu', 'radeon rx 9070 xt (16 gb)')).toBe(
      partKey('gpu', 'Radeon RX 9070 XT 16 GB'),
    )
  })

  it('keeps roles apart and strips Polish letters', () => {
    expect(partKey('psu', 'Zasilacz 850 W')).not.toBe(partKey('mobo', 'Zasilacz 850 W'))
    expect(partKey('mobo', 'Płyta B650 biała')).toBe('mobo-plyta-b650-biala')
  })
})

describe('shopOf', () => {
  it('accepts allowed shops and their subdomains', () => {
    expect(shopOf('https://www.x-kom.pl/p/123')).toBe('x-kom.pl')
    expect(shopOf('https://morele.net/x')).toBe('morele.net')
  })

  it('rejects marketplaces, look-alike hosts and non-http addresses', () => {
    expect(shopOf('https://www.ceneo.pl/123')).toBeNull()
    expect(shopOf('https://evil-x-kom.pl/p/1')).toBeNull()
    expect(shopOf('https://x-kom.pl.evil.com/')).toBeNull()
    expect(shopOf('javascript:alert(1)')).toBeNull()
    expect(shopOf('nie adres')).toBeNull()
  })
})
