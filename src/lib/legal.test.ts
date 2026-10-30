import { describe, expect, it } from 'vitest'

import { splitLineBreaks } from '../seed/legal'

import { hasLegalContent, headingId, legalHeadings, type LegalContent } from './legal'

const text = (value: string) => ({ type: 'text', version: 1, text: value })
const h2 = (value: string) => ({ type: 'heading', tag: 'h2', version: 1, children: [text(value)] })
const p = (value: string) => ({ type: 'paragraph', version: 1, children: [text(value)] })

const content = (children: object[]) =>
  ({
    root: { type: 'root', children, direction: null, format: '', indent: 0, version: 1 },
  }) as unknown as LegalContent

describe('headingId', () => {
  it('makes a Polish title an address fragment', () => {
    expect(headingId('Zwrot w 14 dni')).toBe('zwrot-w-14-dni')
    expect(headingId('Spory i dane osobowe')).toBe('spory-i-dane-osobowe')
    expect(headingId('Komu przekazujemy dane')).toBe('komu-przekazujemy-dane')
    expect(headingId('Wzór formularza zwrotu')).toBe('wzor-formularza-zwrotu')
    expect(headingId('Gwarancja PRO-KOM')).toBe('gwarancja-pro-kom')
    expect(headingId('Cookies')).toBe('cookies')
    expect(headingId('Żółć łódź')).toBe('zolc-lodz')
  })
})

describe('legalHeadings', () => {
  it('numbers the h2 headings in order and skips other nodes', () => {
    const headings = legalHeadings(
      content([h2('Kto sprzedaje'), p('…'), h2('Cookies'), h2('Cookies')]),
    )
    expect(headings.map(({ id, title, number }) => ({ id, title, number }))).toEqual([
      { id: 'kto-sprzedaje', title: 'Kto sprzedaje', number: 1 },
      { id: 'cookies', title: 'Cookies', number: 2 },
      { id: 'cookies-2', title: 'Cookies', number: 3 },
    ])
  })
})

describe('hasLegalContent', () => {
  it('rejects the empty global of a fresh database', () => {
    expect(hasLegalContent({})).toBe(false)
    expect(hasLegalContent({ draft: true })).toBe(false)
    expect(hasLegalContent(null)).toBe(false)
    expect(hasLegalContent({ content: content([p('x')]) })).toBe(true)
  })
})

describe('splitLineBreaks (seed)', () => {
  it('turns <br> in a text into line break nodes', () => {
    const state = content([
      { type: 'quote', version: 1, children: [text('Adresat: X <br> Data: Y')] },
    ])
    const [quote] = splitLineBreaks(state).root.children as unknown as { children: object[] }[]
    expect(quote?.children).toEqual([
      expect.objectContaining({ type: 'text', text: 'Adresat: X' }),
      { type: 'linebreak', version: 1 },
      expect.objectContaining({ type: 'text', text: 'Data: Y' }),
    ])
  })
})
