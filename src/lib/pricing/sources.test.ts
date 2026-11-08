import { describe, expect, it } from 'vitest'

import { DEFAULT_SHOPS, onePerShop } from './sources'

describe('onePerShop (links from a search)', () => {
  const shops = [...DEFAULT_SHOPS]

  it('keeps one new link per allowed shop, in the search order', () => {
    const urls = [
      'https://www.x-kom.pl/p/1-a',
      'https://www.x-kom.pl/p/1-b', // the second x-kom link
      'https://www.sferis.pl/obudowa-i1',
      'https://allegro.pl/oferta/1', // not an allowed shop
      'http://www.morele.net/1', // not https
      'https://www.komputronik.pl/product/1',
    ]
    expect(onePerShop(urls, new Set(), shops)).toEqual([
      'https://www.x-kom.pl/p/1-a',
      'https://www.sferis.pl/obudowa-i1',
      'https://www.komputronik.pl/product/1',
    ])
  })

  it('a known link (on or off) is never saved again; the next one from that shop may be', () => {
    const known = new Set(['https://www.x-kom.pl/p/1-a'])
    expect(
      onePerShop(['https://www.x-kom.pl/p/1-a', 'https://www.x-kom.pl/p/1-b'], known, shops),
    ).toEqual(['https://www.x-kom.pl/p/1-b'])
  })

  it('Ceneo is not on the start list', () => {
    expect(shops).not.toContain('ceneo.pl')
    expect(onePerShop(['https://www.ceneo.pl/141465035'], new Set(), shops)).toEqual([])
  })
})
