'use client'

import { useEffect } from 'react'

import { DESKTOP, FINE_POINTER, matchesMedia, prefersReducedMotion } from '@/lib/motion'

/** The furthest a button follows the cursor (runda v3 PREMIUM §2.3: at most 4 px). */
const PULL = 4

/**
 * Buttons lean slightly towards the cursor (PREMIUM §2.3, desktop with a mouse only). One
 * listener for the whole site, so no button needs a client wrapper: it writes `--mx`/`--my`,
 * which `.btn` turns into a `translate` (globals.css). Nothing happens with reduced motion, on a
 * touch screen or a narrow window.
 */
export function Magnetic() {
  useEffect(() => {
    let current: HTMLElement | null = null
    let frame = 0

    const reset = (el: HTMLElement) => {
      el.style.removeProperty('--mx')
      el.style.removeProperty('--my')
    }
    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return
      const target =
        event.target instanceof Element ? event.target.closest<HTMLElement>('.btn') : null
      if (target !== current) {
        // A move still waiting for its frame belongs to the button just left.
        cancelAnimationFrame(frame)
        if (current) reset(current)
        current = target
      }
      if (!target) return
      // Asked on each move: the visitor may resize the window or switch on reduced motion.
      if (prefersReducedMotion() || !matchesMedia(DESKTOP) || !matchesMedia(FINE_POINTER)) return
      const { clientX, clientY } = event
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const box = target.getBoundingClientRect()
        const x = (clientX - (box.left + box.width / 2)) / (box.width / 2)
        const y = (clientY - (box.top + box.height / 2)) / (box.height / 2)
        target.style.setProperty('--mx', `${(Math.max(-1, Math.min(1, x)) * PULL).toFixed(1)}px`)
        target.style.setProperty('--my', `${(Math.max(-1, Math.min(1, y)) * PULL).toFixed(1)}px`)
      })
    }
    const onLeave = () => {
      cancelAnimationFrame(frame)
      if (current) reset(current)
      current = null
    }

    document.addEventListener('pointermove', onMove, { passive: true })
    document.documentElement.addEventListener('pointerleave', onLeave)
    return () => {
      onLeave()
      document.removeEventListener('pointermove', onMove)
      document.documentElement.removeEventListener('pointerleave', onLeave)
    }
  }, [])

  return null
}
