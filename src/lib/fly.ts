import { DESKTOP, matchesMedia, prefersReducedMotion } from './motion'

/**
 * „The icon flies to the counter” (runda v3 PREMIUM §2.3): a glowing dot in the creature's colour
 * leaves `from` and lands on the first visible `[data-fly="<target>"]` (the comparison in the
 * header or the rail). Desktop only, never with reduced motion; the counter's own jump is the
 * answer everywhere else. Browser only — call it from an event or an effect.
 */
export function flyTo(from: Element, target: string, color: string): void {
  if (prefersReducedMotion() || !matchesMedia(DESKTOP)) return
  const to = [...document.querySelectorAll(`[data-fly="${target}"]`)]
    .map((el) => el.getBoundingClientRect())
    .find((r) => r.width > 0 && r.bottom > 0 && r.top < window.innerHeight)
  if (!to) return
  const start = from.getBoundingClientRect()
  const dx = to.left + to.width / 2 - (start.left + start.width / 2)
  const dy = to.top + to.height / 2 - (start.top + start.height / 2)

  const dot = document.createElement('span')
  dot.className = 'fly-dot'
  dot.setAttribute('aria-hidden', 'true')
  dot.style.setProperty('--c', color)
  dot.style.left = `${start.left + start.width / 2}px`
  dot.style.top = `${start.top + start.height / 2}px`
  document.body.append(dot)
  // An arc: up first, then into the counter, shrinking on the way.
  const flight = dot.animate(
    [
      { transform: 'translate(-50%, -50%) scale(1)', opacity: 1 },
      {
        transform: `translate(calc(-50% + ${dx * 0.45}px), calc(-50% + ${dy * 0.45 - 80}px)) scale(0.8)`,
        opacity: 1,
        offset: 0.45,
      },
      {
        transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0.35)`,
        opacity: 0.6,
      },
    ],
    { duration: 640, easing: 'cubic-bezier(.45, 0, .2, 1)' },
  )
  flight.onfinish = flight.oncancel = () => dot.remove()
}
