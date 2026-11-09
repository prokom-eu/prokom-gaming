/**
 * The smooth scroll itself (runda v3 PREMIUM §2.3, F2), shared by section links
 * (components/motion/SmoothAnchors) and the rail's „Do góry”. Browser only. One trip at a time:
 * a new one takes over from the running one; the wheel, a touch, a key or a click stops it.
 * The curve and the duration: `lib/smoothScroll`.
 */
import { scrollDuration, scrollEase, scrollTargetY } from './smoothScroll'

/** How long the heading of the section you arrived at glows (globals.css `.is-arrived`). */
const ARRIVED_MS = 1400

let stop: (() => void) | null = null

/** Stops a running trip where it is. */
export function cancelGlide() {
  stop?.()
}

/**
 * Glides until `targetY()` — measured again every frame, because sections below may still be
 * growing (`content-visibility: auto`) — and calls `onArrive` when it gets there.
 */
export function glide(targetY: () => number, onArrive?: () => void) {
  cancelGlide()
  const from = window.scrollY
  const duration = scrollDuration(targetY() - from)
  let frame = 0
  let start = 0

  const finish = (arrived: boolean) => {
    cancelAnimationFrame(frame)
    window.removeEventListener('wheel', interrupt)
    window.removeEventListener('touchstart', interrupt)
    window.removeEventListener('keydown', interrupt)
    window.removeEventListener('pointerdown', interrupt)
    stop = null
    if (arrived) onArrive?.()
  }
  const interrupt = () => finish(false)
  const step = (now: number) => {
    if (!start) start = now
    const t = duration ? Math.min(1, (now - start) / duration) : 1
    window.scrollTo(0, from + (targetY() - from) * scrollEase(t))
    if (t < 1) frame = requestAnimationFrame(step)
    else finish(true)
  }

  stop = interrupt
  window.addEventListener('wheel', interrupt, { passive: true })
  window.addEventListener('touchstart', interrupt, { passive: true })
  window.addEventListener('keydown', interrupt)
  window.addEventListener('pointerdown', interrupt)
  frame = requestAnimationFrame(step)
}

/** Glides to a section (below the header), then hands it focus and lights its heading. */
export function glideToSection(target: HTMLElement) {
  const root = document.documentElement
  glide(
    () =>
      scrollTargetY(
        target.getBoundingClientRect().top,
        window.scrollY,
        // Like the browser's own jump: the page's scroll padding plus the target's scroll margin
        // (build page sections clear the sticky price bar, legal headings the phone header).
        (parseFloat(getComputedStyle(root).scrollPaddingTop) || 0) +
          (parseFloat(getComputedStyle(target).scrollMarginTop) || 0),
        root.scrollHeight - window.innerHeight,
      ),
    () => arrive(target),
  )
}

/** Glides back to the top of the page. */
export function glideToTop() {
  glide(() => 0)
}

function arrive(target: HTMLElement) {
  // Focus without a second scroll, so keyboard and screen readers continue from the section; a
  // section is not focusable by itself.
  if (!target.matches('a, button, input, select, textarea, [tabindex]')) {
    target.setAttribute('tabindex', '-1')
    // No focus ring around a whole section (globals.css); the heading glow marks the place.
    target.setAttribute('data-glide-target', '')
    target.addEventListener(
      'blur',
      () => {
        target.removeAttribute('tabindex')
        target.removeAttribute('data-glide-target')
      },
      { once: true },
    )
  }
  target.focus({ preventScroll: true })
  // „You are here”: the section heading glows once (globals.css).
  const heading = target.matches('h1, h2, h3')
    ? target
    : target.querySelector<HTMLElement>('h1, h2')
  if (!heading) return
  heading.classList.remove('is-arrived')
  void heading.offsetWidth
  heading.classList.add('is-arrived')
  window.setTimeout(() => heading.classList.remove('is-arrived'), ARRIVED_MS)
}
