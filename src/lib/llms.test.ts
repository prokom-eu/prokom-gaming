import { describe, expect, it } from 'vitest'

import { llmsText, type LlmsInput } from './llms'

const INPUT: LlmsInput = {
  siteUrl: 'https://prokomgaming.pl',
  builds: [
    {
      slug: 'skrzat',
      name: 'Skrzat',
      tierLabel: 'FullHD start',
      resolution: 'fullhd',
      price: 3990,
    },
    { slug: 'wampir', name: 'Wampir', tierLabel: '2K', resolution: 'qhd', price: 14540 },
    { slug: 'perun', name: 'Perun', tierLabel: '4K', resolution: 'uhd', price: null },
  ],
  pricedAt: '2026-11-10T08:00:00.000Z',
  games: [{ slug: 'fortnite', name: 'Fortnite' }],
  faq: [
    { question: 'Czy mogę kupić na raty?', answer: 'Na razie nie prowadzimy sprzedaży ratalnej.' },
  ],
}

describe('llmsText (/llms.txt)', () => {
  const text = llmsText(INPUT)

  it('starts with the name and a one-line summary, as llmstxt.org asks', () => {
    expect(text.startsWith('# PRO-KOM Gaming\n\n> Komputery do gier')).toBe(true)
  })

  it('the company, the one shop and contact as on the site (NAP)', () => {
    expect(text).toContain('PRO-KOM Tadeusz Wójciak, ul. Orkana 16B, 34-700 Rabka-Zdrój')
    expect(text).toContain('+48 883 200 151')
    expect(text).toContain('kontakt@prokomgaming.pl')
    expect(text).not.toMatch(/Zakopan/)
  })

  it('builds with published prices only, absolute links, price date', () => {
    expect(text).toMatch(
      /- \[Wampir\]\(https:\/\/prokomgaming\.pl\/zestawy\/wampir\): 14\s540 zł, monitor 2K \(poziom: 2K\)/,
    )
    expect(text).toContain('(ceny brutto z 10.11.2026)')
    expect(text).not.toContain('[Perun]')
  })

  it('game pages, the local page and the questions', () => {
    expect(text).toContain('[Komputer do Fortnite](https://prokomgaming.pl/komputer-do/fortnite)')
    expect(text).toContain('https://prokomgaming.pl/komputery-do-gier-rabka-zdroj')
    expect(text).toContain('### Czy mogę kupić na raty?')
  })

  it('no costs, internal models, instalment offer or FPS promise', () => {
    expect(text).not.toMatch(/koszt zakupu|marż|internalModel|Santander|(?<!nie )gwarantujemy/i)
    expect(text).toContain('Nie gwarantujemy liczby klatek.')
    // „raty” only in the FAQ question answered „Na razie nie…” (spec. §27.7).
    const outsideFaq = text.replace(
      /### Czy (mogę|da się) kupić na raty\?\n\nNa razie nie[^\n]*/g,
      '',
    )
    expect(outsideFaq).not.toMatch(
      /(?<![\p{L}])(rat|raty|ratach|ratami|ratalnie|ratalnej)(?![\p{L}])/iu,
    )
  })

  it('without an offer the facts about the company still stand', () => {
    const bare = llmsText({ ...INPUT, builds: [], pricedAt: null, games: [], faq: [] })
    expect(bare).toContain('## Najważniejsze fakty')
    expect(bare).not.toContain('## Zestawy i ceny')
    expect(bare).not.toContain('## Komputer do gry')
  })
})
