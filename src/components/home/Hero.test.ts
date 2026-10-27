import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { EMPTY_HERO } from '@/lib/home'

import { Hero } from './Hero'

// Review G7: without offer data (empty database or a failed read) the hero used to render
// nothing — the page lost its only <h1> and its buttons.
describe('Hero without offer data', () => {
  const html = renderToStaticMarkup(createElement(Hero, { data: EMPTY_HERO }))

  it('keeps the heading and both buttons', () => {
    expect(html).toContain('<h1>Komputery do gier. Sprawdzone w')
    expect(html).toContain('href="/konfigurator"')
    expect(html).toContain('href="/zestawy"')
  })

  it('shows no card, medallions or scene', () => {
    expect(html).not.toContain('hero-card')
    expect(html).not.toContain('Poziomy mocy')
    expect(html).not.toContain('hero__scene')
  })
})
