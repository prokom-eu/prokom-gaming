import fs from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'

import {
  ABOUT_SECTIONS,
  activeIndex,
  BUILD_SECTIONS,
  GAME_SECTIONS,
  PARENTS_SECTIONS,
  HOME_SECTIONS,
  pageGroup,
  RAIL_ICONS,
  railHidden,
  ringOffset,
  scrollProgress,
} from './railConfig'

/** Every `id="…"` written in the components of a folder. */
function idsIn(dir: string): Set<string> {
  const ids = new Set<string>()
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.tsx'))) {
    const text = fs.readFileSync(path.join(dir, file), 'utf8')
    for (const m of text.matchAll(/\bid="([a-z0-9-]+)"/g)) ids.add(m[1])
  }
  return ids
}

describe('rail sections', () => {
  it('lists the 11 home sections I–XI, each anchor present in a home component', () => {
    const ids = idsIn(path.resolve('src/components/home'))
    expect(HOME_SECTIONS.map((s) => s.roman)).toEqual(
      'I II III IV V VI VII VIII IX X XI'.split(' '),
    )
    for (const s of HOME_SECTIONS) expect(ids, s.id).toContain(s.id)
  })

  it('has every build page anchor in a build page component', () => {
    const ids = idsIn(path.resolve('src/components/build'))
    for (const s of BUILD_SECTIONS) expect(ids, s.id).toContain(s.id)
  })

  it('has every „O nas” and game page anchor in those pages', () => {
    const about = fs.readFileSync(path.resolve('src/app/(site)/o-nas/page.tsx'), 'utf8')
    for (const s of ABOUT_SECTIONS) expect(about, s.id).toContain(`id="${s.id}"`)
    const game = [
      fs.readFileSync(path.resolve('src/app/(site)/komputer-do/[gra]/page.tsx'), 'utf8'),
      fs.readFileSync(path.resolve('src/components/games/GameResults.tsx'), 'utf8'),
    ].join(' ')
    for (const s of GAME_SECTIONS) expect(game, s.id).toContain(`id="${s.id}"`)
  })

  it('has every „Dla rodziców” anchor on that page', () => {
    const page = fs.readFileSync(path.resolve('src/app/(site)/dla-rodzicow/page.tsx'), 'utf8')
    for (const s of PARENTS_SECTIONS) expect(page, s.id).toContain(`id="${s.id}"`)
  })

  it('never repeats an anchor and has an icon for every entry', () => {
    const all = [...HOME_SECTIONS, ...BUILD_SECTIONS]
    expect(new Set(HOME_SECTIONS.map((s) => s.id)).size).toBe(HOME_SECTIONS.length)
    expect(new Set(BUILD_SECTIONS.map((s) => s.id)).size).toBe(BUILD_SECTIONS.length)
    for (const s of all) expect(RAIL_ICONS[s.icon]).toBeTruthy()
  })
})

describe('pageGroup / railHidden', () => {
  const names = new Map([['wampir', 'Wampir']])

  it('gives a build page its group with the creature name', () => {
    expect(pageGroup('/zestawy/wampir', names)?.title).toBe('Na tej stronie · Wampir')
    expect(pageGroup('/zestawy/nieznany', names)).toBeNull()
    expect(pageGroup('/zestawy', names)).toBeNull()
    expect(pageGroup('/', names)).toBeNull()
    expect(pageGroup('/o-nas', names)?.sections).toBe(ABOUT_SECTIONS)
    expect(pageGroup('/dla-rodzicow', names)?.sections).toBe(PARENTS_SECTIONS)
    expect(pageGroup('/komputer-do/fortnite', names)?.sections).toBe(GAME_SECTIONS)
    // Fewer than three sections or their own navigation: no group (NAWIGACJA §4.4).
    expect(pageGroup('/dobor-pod-gre', names)).toBeNull()
    expect(pageGroup('/pytania', names)).toBeNull()
    expect(pageGroup('/poradniki/rodzice', names)).toBeNull()
  })

  it('hides the rail on the certificate and the account pages only', () => {
    expect(railHidden('/metryka/PKG-2026-0001')).toBe(true)
    expect(railHidden('/konto')).toBe(true)
    expect(railHidden('/konto/zamowienia')).toBe(true)
    expect(railHidden('/konfigurator')).toBe(false)
    expect(railHidden('/kontakt')).toBe(false)
  })
})

describe('active section and progress', () => {
  it('takes the last section whose top passed the reading line', () => {
    expect(activeIndex([100, 900, 1800], 400)).toBe(0)
    expect(activeIndex([-1200, -300, 380, 1200], 400)).toBe(2)
    expect(activeIndex([500, 1500], 400)).toBe(-1)
    expect(activeIndex([], 400)).toBe(-1)
  })

  it('measures scroll progress and the ring offset at 0, 50 and 100%', () => {
    expect(scrollProgress(0, 3000, 1000)).toBe(0)
    expect(scrollProgress(1000, 3000, 1000)).toBe(50)
    expect(scrollProgress(2500, 3000, 1000)).toBe(100)
    expect(scrollProgress(0, 800, 1000)).toBe(0)
    expect(ringOffset(0)).toBe(62.8)
    expect(ringOffset(50)).toBe(31.4)
    expect(ringOffset(100)).toBe(0)
  })
})
