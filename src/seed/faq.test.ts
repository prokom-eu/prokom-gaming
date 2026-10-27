import { describe, expect, it } from 'vitest'

import { mapFaq } from './faq'

describe('mapFaq', () => {
  const faq = mapFaq()

  it('maps 21 questions of /pytania and 6 of the home page', () => {
    expect(faq).toHaveLength(27)
    expect(faq.filter((f) => f.group === 'home')).toHaveLength(6)
    expect(faq.filter((f) => f.group !== 'home')).toHaveLength(21)
  })

  it('keeps the home questions in board order', () => {
    const home = faq.filter((f) => f.group === 'home')
    expect(home.map((f) => f.order)).toEqual([1, 2, 3, 4, 5, 6])
    expect(home[0].question).toBe('Dlaczego nie ma przycisku „Kup”?')
    expect(home[5].question).toBe('Mogę sam dołożyć RAM albo dysk?')
  })

  it('keeps the answer about instalments as "not for now" (no instalment offer)', () => {
    const raty = faq.find((f) => /raty/i.test(f.question))
    expect(raty?.answer).toMatch(/^Na razie nie/)
  })

  it('rejects an unknown group', () => {
    expect(() => mapFaq([{ group: 'Inne', items: [{ q: 'x', a: 'y' }] }])).toThrow(/Inne/)
  })
})
