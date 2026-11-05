import { describe, expect, it } from 'vitest'

import { NAV_SCROLL_START, navScrollState, type NavScroll } from './navScroll'

/** Feeds a sequence of scroll positions, like successive animation frames. */
const run = (...ys: number[]): NavScroll => ys.reduce(navScrollState, NAV_SCROLL_START)

describe('navScrollState', () => {
  it('starts at the top, visible', () => {
    expect(run(0)).toEqual({ y: 0, top: true, scrolled: false, hidden: false })
  })

  it('leaves the top after 8 px but stays full height until 80 px', () => {
    expect(run(10)).toMatchObject({ top: false, scrolled: false, hidden: false })
    expect(run(79)).toMatchObject({ top: false, scrolled: false, hidden: false })
  })

  it('turns into glass from 80 px and hides while moving down past it', () => {
    expect(run(80)).toMatchObject({ scrolled: true, hidden: false })
    expect(run(80, 200)).toMatchObject({ scrolled: true, hidden: true })
  })

  it('comes back on the first move up, still glass', () => {
    expect(run(900, 880)).toMatchObject({ scrolled: true, hidden: false })
  })

  it('ignores moves smaller than 4 px', () => {
    const hidden = run(900)
    expect(navScrollState(hidden, 897)).toBe(hidden)
    expect(navScrollState(hidden, 895)).toMatchObject({ hidden: false })
  })

  it('back at the top: transparent again and never hidden', () => {
    expect(run(900, 0)).toEqual({ y: 0, top: true, scrolled: false, hidden: false })
  })
})
