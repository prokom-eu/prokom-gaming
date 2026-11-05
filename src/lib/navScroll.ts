/**
 * Header state from the scroll position (NAWIGACJA.md §2.2, ADR-G012 pkt 2): over the scene at the
 * top, glass once scrolled, hidden while scrolling down. Pure, so the thresholds are unit-tested;
 * `SiteHeader` feeds it `window.scrollY` on every animation frame.
 */
export type NavScroll = {
  /** Last position that changed the state (small jitters are ignored). */
  y: number
  /** At the very top: transparent over a scene, light over a light section. */
  top: boolean
  /** Scrolled far enough for the compact glass header. */
  scrolled: boolean
  /** Moving down past the threshold: the header slides away. */
  hidden: boolean
}

/** Below this the header counts as "at the top". */
export const TOP_UNDER = 8
/** From here the header turns into glass and may hide. */
export const SCROLLED_FROM = 80
/** Smaller moves are ignored (touchpads and momentum scrolling report tiny steps). */
export const JITTER = 4

export const NAV_SCROLL_START: NavScroll = { y: 0, top: true, scrolled: false, hidden: false }

export function navScrollState(prev: NavScroll, y: number): NavScroll {
  const delta = y - prev.y
  if (Math.abs(delta) < JITTER) return prev
  return {
    y,
    top: y < TOP_UNDER,
    scrolled: y >= SCROLLED_FROM,
    hidden: delta > 0 && y > SCROLLED_FROM,
  }
}
