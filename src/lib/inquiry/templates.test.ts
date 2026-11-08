import { describe, expect, it } from 'vitest'

import { partsList, placeholdersIn, renderTemplate } from './templates'

const OFFER =
  'Dzień dobry,\n\nprzesyłam ofertę {nr}: {zestaw}, {cena} z montażem.\n\nSkład:\n{czesci}\n\n{podpis}'

describe('renderTemplate', () => {
  it('fills every known variable', () => {
    const { text, missing } = renderTemplate(OFFER, {
      nr: 'PKG-2026-0047',
      zestaw: 'Wampir',
      cena: '14 540 zł',
      czesci: '• AMD Ryzen 7 9800X3D',
      podpis: 'Pozdrawiam,\nKrystian',
    })
    expect(missing).toEqual([])
    expect(text).toBe(
      'Dzień dobry,\n\nprzesyłam ofertę PKG-2026-0047: Wampir, 14 540 zł z montażem.\n\nSkład:\n• AMD Ryzen 7 9800X3D\n\nPozdrawiam,\nKrystian',
    )
  })

  it('puts the signature exactly once — only where {podpis} stands', () => {
    const { text } = renderTemplate('Dzień dobry,\n\n{podpis}', { podpis: 'Pozdrawiam,\nKrystian' })
    expect(text.split('Pozdrawiam').length - 1).toBe(1)
    expect(renderTemplate('Bez podpisu', { podpis: 'Pozdrawiam' }).text).toBe('Bez podpisu')
  })

  it('leaves a variable without a value in place and reports it', () => {
    const { text, missing } = renderTemplate(OFFER, {
      nr: 'PKG-2026-0001',
      zestaw: '  ',
      cena: null,
    })
    expect(text).toContain('{zestaw}, {cena}')
    expect(missing).toEqual(['zestaw', 'cena', 'czesci', 'podpis'])
  })

  it('reports a repeated variable once and keeps unknown braces', () => {
    const { text, missing } = renderTemplate('{nr} {nr} {nr_zam} {etap}', {})
    expect(text).toBe('{nr} {nr} {nr_zam} {etap}')
    expect(missing).toEqual(['nr'])
  })
})

describe('placeholdersIn', () => {
  it('lists known variables left in an edited reply', () => {
    expect(placeholdersIn('Cena: {cena}, etap {etap}, {cena}')).toEqual(['cena'])
    expect(placeholdersIn('Gotowe.')).toEqual([])
  })
})

describe('partsList', () => {
  it('one bullet per model, blanks dropped', () => {
    expect(partsList(['AMD Ryzen 7 9800X3D', ' ', 'RTX 5070 Ti 16 GB'])).toBe(
      '• AMD Ryzen 7 9800X3D\n• RTX 5070 Ti 16 GB',
    )
    expect(partsList([])).toBeNull()
  })
})
