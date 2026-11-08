'use client'

import { useLayoutEffect, useRef } from 'react'

import { prefersReducedMotion } from '@/lib/motion'
import { zl } from '@/lib/pricing/format'

/** Matches `--dur-3` (tokens.css): an answer to a click, not a show. */
const DURATION = 480

/** Ease-out (quart), like `--ease-enter`: fast start, a soft landing on the new value. */
const easeOut = (p: number) => 1 - (1 - p) ** 4

/**
 * A price that rolls to its new value with a short gold flash (runda v3 PREMIUM §2.3,
 * configurator). The digits on screen are an attribute shown by CSS; the DOM text is always the
 * final price, so a live region announces it once and tests read the real number. The tween
 * writes straight to the element, not to React state: it is presentation only.
 * Reduced motion: the new price at once, no flash.
 */
export function RollNumber({ value }: { value: number | null }) {
  const ref = useRef<HTMLSpanElement>(null)
  const shown = useRef(value)

  // Before paint: React has just written the final text into the attribute.
  useLayoutEffect(() => {
    const el = ref.current
    const from = shown.current
    if (!el || from === value) return
    if (value === null || from === null || prefersReducedMotion()) {
      shown.current = value
      return
    }
    el.classList.remove('is-flash')
    void el.offsetWidth // restart the flash when the price changes again mid-way
    el.classList.add('is-flash')
    const start = performance.now()
    let frame = 0
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / DURATION)
      const current = Math.round(from + (value - from) * easeOut(p))
      shown.current = current
      el.dataset.v = zl(current)
      if (p < 1) frame = requestAnimationFrame(tick)
    }
    el.dataset.v = zl(from)
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [value])

  const text = zl(value)
  return (
    <span ref={ref} className="roll" data-v={text}>
      <span className="count__v">{text}</span>
    </span>
  )
}
