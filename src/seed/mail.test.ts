import { readFileSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import replyTemplates from '../../seed/prokomgaming/reply-templates.json'
import { placeholdersIn, renderTemplate } from '../lib/inquiry/templates'

// The board keeps the starting templates in a JS constant `TPL = [[name, body], …];`.
const board = readFileSync(
  path.resolve(__dirname, '../../docs/design/prokomgaming/panel/boards/Zapytania.dc.html'),
  'utf8',
)
// One deliberate change against the board: no salon in Zakopane (Krystian, 01.11.2026).
const tpl = (
  JSON.parse(/TPL = (\[\[.*?\]\]);/s.exec(board)?.[1] ?? '[]') as [string, string][]
).map(([name, body]): [string, string] => [
  name,
  body.replace(
    'Odbiór osobisty w Rabce albo w Zakopanem jest możliwy.',
    'Odbiór osobisty w Rabce-Zdroju jest możliwy.',
  ),
])

describe('reply templates seed', () => {
  it('the four board templates, 1:1 and in order', () => {
    const fromSeed = replyTemplates.templates
      .filter((t) => t.kind !== 'stage')
      .map((t) => [t.name, t.body])
    expect(tpl).toHaveLength(4)
    expect(fromSeed).toEqual(tpl)
  })

  it('every template signs only through {podpis}, exactly once', () => {
    for (const { body } of replyTemplates.templates) {
      expect(body.split('{podpis}').length - 1).toBe(1)
      const { text } = renderTemplate(body, { podpis: 'PODPIS' })
      expect(text.split('PODPIS').length - 1).toBe(1)
    }
  })

  it('only the offer template marks an offer', () => {
    const offers = replyTemplates.templates.filter((t) => t.kind === 'offer').map((t) => t.name)
    expect(offers).toEqual(['Oferta z listą części'])
    const offer = replyTemplates.templates.find((t) => t.kind === 'offer')
    expect(placeholdersIn(offer?.body ?? '')).toEqual(['nr', 'zestaw', 'cena', 'czesci', 'podpis'])
  })
})
