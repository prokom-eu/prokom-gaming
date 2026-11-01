import { describe, expect, it } from 'vitest'

import { navGroups, navMore, navTabs } from './navModel'

const keys = (items: { key: string }[]) => items.map((i) => i.key)

describe('panel navigation', () => {
  it('gives the admin the four tabs of the boards before "Więcej"', () => {
    expect(navTabs('admin').map((i) => i.short ?? i.label)).toEqual([
      'Pulpit',
      'Zapytania',
      'Zatwierdź',
      'Zestawy',
    ])
  })

  it('gives serwis the workshop tabs and nothing about inquiries or prices', () => {
    expect(navTabs('serwis').map((i) => i.label)).toEqual(['Warsztat', 'Zgłoszenia', 'Egzemplarze'])
    const all = [...navGroups('serwis').flatMap((g) => g.items), ...navMore('serwis')]
    expect(keys(all)).not.toContain('inquiries')
    expect(keys(all)).not.toContain('approve')
    expect(keys(all)).not.toContain('settings')
    expect(all.every((i) => i.roles.includes('serwis'))).toBe(true)
  })

  it('hides screens whose session has not been built yet instead of linking to nothing', () => {
    const shown = [...navGroups('admin').flatMap((g) => g.items), ...navMore('admin')]
    for (const hidden of ['clients', 'reports', 'stats']) {
      expect(keys(shown)).not.toContain(hidden)
    }
  })

  it('keeps the sidebar groups in the order of the boards', () => {
    expect(navGroups('admin').map((g) => g.label)).toEqual([
      'Codziennie',
      'Ceny',
      'Oferta',
      'System',
    ])
  })

  it('shows the settings to the admin only (P1 PR 2)', () => {
    expect(navMore('admin').map((i) => i.key)).toContain('settings')
    expect(navMore('serwis').map((i) => i.key)).not.toContain('settings')
  })

  it('points "Zatwierdź" at its own screen and shows the prices centre (P6)', () => {
    expect(navTabs('admin').find((i) => i.key === 'approve')?.path).toBe('/ceny/zatwierdzanie')
    const shown = [...navGroups('admin').flatMap((g) => g.items), ...navMore('admin')]
    expect(shown.find((i) => i.key === 'pricesCentre')?.path).toBe('/ceny')
  })
})
