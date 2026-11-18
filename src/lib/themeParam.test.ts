import { describe, expect, it } from 'vitest'

import { withoutThemeParam } from './themeParam'

describe('withoutThemeParam', () => {
  it('removes the parameter and keeps the path', () => {
    expect(withoutThemeParam('https://prokomgaming.pl/zestawy?motyw=jasny')).toBe('/zestawy')
  })

  it('keeps other parameters, their order and the hash', () => {
    expect(withoutThemeParam('https://prokomgaming.pl/konfigurator?a=1&motyw=ciemny&b=2#gry')).toBe(
      '/konfigurator?a=1&b=2#gry',
    )
  })

  it('removes unknown and empty values too', () => {
    expect(withoutThemeParam('http://localhost:3100/?motyw=fioletowy')).toBe('/')
    expect(withoutThemeParam('http://localhost:3100/?motyw')).toBe('/')
  })

  it('removes every copy of the parameter', () => {
    expect(withoutThemeParam('https://prokomgaming.pl/?motyw=auto&motyw=jasny&x=1')).toBe('/?x=1')
  })

  it('returns null when there is nothing to remove', () => {
    expect(withoutThemeParam('https://prokomgaming.pl/zestawy?sort=cena')).toBeNull()
    expect(withoutThemeParam('https://prokomgaming.pl/?motywy=1')).toBeNull()
  })
})
