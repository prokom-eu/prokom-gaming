import { describe, expect, it } from 'vitest'

import faqSeed from '../../seed/prokomgaming/faq.json'

import { faqPageJsonLd, faqSections, questionsCount } from './faq'

const doc = (id: number, group: string, question = `Q${id}`) => ({
  id,
  group: group as never,
  question,
  answer: `A${id}`,
})

describe('faqSections', () => {
  it('keeps board order and leaves out home, build and empty groups', () => {
    const sections = faqSections([
      doc(1, 'parents'),
      doc(2, 'home'),
      doc(3, 'purchase'),
      doc(4, 'build'),
      doc(5, 'purchase'),
    ])
    expect(sections.map((s) => s.group)).toEqual(['purchase', 'parents'])
    expect(sections[0]).toMatchObject({ label: 'Zakup i płatność' })
    expect(sections[0]?.questions.map((q) => q.id)).toEqual([3, 5])
  })
})

describe('questionsCount', () => {
  it('uses the Polish plural like the board', () => {
    expect(questionsCount(6)).toBe('6 pytań')
    expect(questionsCount(4)).toBe('4 pytania')
    expect(questionsCount(3)).toBe('3 pytania')
    expect(questionsCount(1)).toBe('1 pytanie')
  })
})

describe('faqPageJsonLd', () => {
  it('lists every question of every group', () => {
    const ld = faqPageJsonLd(faqSections([doc(1, 'purchase', 'Jak?'), doc(2, 'tech')])) as {
      '@type': string
      mainEntity: { name: string; acceptedAnswer: { text: string } }[]
    }
    expect(ld['@type']).toBe('FAQPage')
    expect(ld.mainEntity).toHaveLength(2)
    expect(ld.mainEntity[0]).toMatchObject({ name: 'Jak?', acceptedAnswer: { text: 'A1' } })
  })
})

describe('seed', () => {
  it('has the 21 questions of the board in 5 page groups (spec. §19)', () => {
    const pageGroups = faqSeed.items.filter((g) => !('onHomeOnly' in g && g.onHomeOnly))
    expect(pageGroups.map((g) => g.items.length)).toEqual([6, 4, 4, 4, 3])
  })
})
