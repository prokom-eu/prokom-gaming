/**
 * The arithmetic of the smooth scroll between sections (components/motion/SmoothAnchors): how
 * long a trip takes and how it moves. Pure, so it is tested without a browser.
 */

/** A short trip still takes this long — anything quicker reads as a jump. */
export const SCROLL_MIN_MS = 520
/** A trip across the whole home page never takes longer: a longer one makes people wait. */
export const SCROLL_MAX_MS = 1250

/**
 * Duration of a trip of `distance` pixels: grows with the square root of the distance, so one
 * section away feels unhurried and ten sections away does not drag.
 */
export function scrollDuration(distance: number): number {
  const d = Math.abs(distance)
  if (d < 1) return 0
  return Math.round(Math.min(SCROLL_MAX_MS, Math.max(SCROLL_MIN_MS, 380 + Math.sqrt(d) * 11)))
}

const SPLIT = 0.4
const AT_SPLIT = 5 / 11

/**
 * Ease-in-out with a long landing: a soft start, a quick middle and a slow, calm arrival (the
 * quartic rise, the quintic settle). 0 → 0, 1 → 1, never overshoots.
 */
export function scrollEase(t: number): number {
  if (t <= 0) return 0
  if (t >= 1) return 1
  // The two curves meet at t = 0.4 with the same value (5/11) and the same speed, so the motion
  // has no jolt where one hands over to the other.
  return t < SPLIT
    ? AT_SPLIT * (t / SPLIT) ** 4
    : 1 - (1 - AT_SPLIT) * (1 - (t - SPLIT) / (1 - SPLIT)) ** 5
}

/** The scroll position that puts an element's top `padding` px below the top of the window. */
export function scrollTargetY(
  elementTop: number,
  scrollY: number,
  padding: number,
  maxScroll: number,
): number {
  return Math.min(Math.max(0, Math.round(elementTop + scrollY - padding)), Math.max(0, maxScroll))
}
