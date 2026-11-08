/**
 * Motion in one place (runda v3 PREMIUM §2.1, ADR-G014): the media queries every moving part
 * asks, and the cascade rule. CSS keeps its own `prefers-reduced-motion` blocks (globals.css
 * lands every animation on its end state); JavaScript asks here, never `matchMedia` by hand.
 * Pure and safe on the server; the React hooks live in `useMotion.ts`.
 */
export const REDUCED_MOTION = '(prefers-reduced-motion: reduce)'
/** Autoswitch and mouse parallax only on a desktop width (ADR-G003 §5). */
export const DESKTOP = '(min-width: 1024px)'
/** A real mouse: parallax follows a cursor, not a finger. */
export const FINE_POINTER = '(hover: hover) and (pointer: fine)'

/** At most this many items enter one after another; the rest come with the last one. */
export const STAGGER_MAX = 6

/** Current answer of a media query; `false` on the server. */
export function matchesMedia(query: string): boolean {
  return typeof window !== 'undefined' && window.matchMedia(query).matches
}

/** True when the visitor asked the system for less motion. */
export function prefersReducedMotion(): boolean {
  return matchesMedia(REDUCED_MOTION)
}

/** Position of an item in a cascade (0…STAGGER_MAX - 1): later items share the last slot. */
export function staggerIndex(position: number): number {
  return Math.min(Math.max(0, Math.floor(position)), STAGGER_MAX - 1)
}
