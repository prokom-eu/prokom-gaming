import { describe, expect, it } from 'vitest'

import guidesSeed from '../../seed/prokomgaming/guides.json'

import {
  guideJsonLd,
  guideKicker,
  guideList,
  relatedGuides,
  topicFromParam,
  type GuideCard,
} from './guides'

const card = (slug: string, category: string): GuideCard => ({
  slug,
  title: slug,
  lead: '',
  category,
  readingTime: 5,
  creature: 'skrzat',
})

const guides = [card('a', 'parents'), card('b', 'games'), card('c', 'hardware'), card('d', 'games')]

describe('topicFromParam', () => {
  it('reads the topic of the address and ignores unknown ones', () => {
    expect(topicFromParam('gry')).toBe('games')
    expect(topicFromParam(['dla-rodzicow'])).toBe('parents')
    expect(topicFromParam('nie-ma')).toBeNull()
    expect(topicFromParam(undefined)).toBeNull()
  })
})

describe('guideList', () => {
  it('features the newest guide and shows chips only for topics with guides', () => {
    const list = guideList(guides, null)
    expect(list.featured?.slug).toBe('a')
    expect(list.rest.map((g) => g.slug)).toEqual(['b', 'c', 'd'])
    expect(list.topics.map((t) => t.value)).toEqual(['parents', 'hardware', 'games'])
  })

  it('filters by topic; an empty topic has no featured guide', () => {
    expect(guideList(guides, 'games').featured?.slug).toBe('b')
    expect(guideList(guides, 'games').rest.map((g) => g.slug)).toEqual(['d'])
    expect(guideList(guides, 'after').featured).toBeNull()
  })
})

describe('relatedGuides', () => {
  it('puts the same topic first and leaves out the current guide', () => {
    expect(relatedGuides(guides, guides[1]!).map((g) => g.slug)).toEqual(['d', 'a', 'c'])
    expect(relatedGuides(guides, guides[0]!, 2)).toHaveLength(2)
  })
})

describe('guideKicker', () => {
  it('matches the board line', () => {
    expect(guideKicker('parents', 8)).toBe('Dla rodziców, 8 min czytania')
  })
})

describe('guideJsonLd', () => {
  it('describes the article and its breadcrumbs', () => {
    const [article, crumbs] = guideJsonLd({
      siteUrl: 'https://prokomgaming.pl',
      slug: 'rodzice',
      title: 'Jak kupić',
      lead: 'Pięć pytań',
      author: 'Zespół PRO-KOM Gaming',
      publishedAt: null,
      updatedAt: '2026-10-30T10:00:00.000Z',
      category: 'parents',
    }) as [Record<string, unknown>, Record<string, unknown>]
    expect(article).toMatchObject({
      '@type': 'Article',
      headline: 'Jak kupić',
      mainEntityOfPage: 'https://prokomgaming.pl/poradniki/rodzice',
    })
    expect(article).not.toHaveProperty('datePublished')
    expect(crumbs['@type']).toBe('BreadcrumbList')
  })
})

describe('seed', () => {
  it('has one guide ready and six drafts, all in known topics (spec. §20)', () => {
    const labels = new Set(['Dla rodziców', 'Wybór sprzętu', 'Gry', 'Po zakupie'])
    expect(guidesSeed.items.filter((g) => g.status === 'ready').map((g) => g.slug)).toEqual([
      'rodzice',
    ])
    expect(guidesSeed.items).toHaveLength(7)
    expect(guidesSeed.items.every((g) => labels.has(g.category))).toBe(true)
  })
})
