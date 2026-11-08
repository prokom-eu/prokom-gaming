'use client'

import { usePathname } from 'next/navigation'
import { useEffect } from 'react'

import { prefersReducedMotion, staggerIndex } from '@/lib/motion'

/**
 * Entry into view for every `[data-reveal]` on the page (runda v3 PREMIUM §2.3: cascade of the
 * creature cards, at most 6 at once). One observer for the whole site, so server-rendered cards
 * need no client wrapper.
 *
 * Every element is decided once, when it first appears: on screen → `in` at once (nothing
 * flashes after hydration or streaming); below the fold → `wait` (hidden) until it scrolls into
 * view. Without JavaScript, or with reduced motion, nothing is ever hidden.
 */
export function RevealObserver() {
  const pathname = usePathname()

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined' || prefersReducedMotion()) return

    const observer = new IntersectionObserver(
      (entries) => {
        const entering = entries.filter((e) => e.isIntersecting).map((e) => e.target)
        entering.forEach((el, i) => {
          if (!(el instanceof HTMLElement)) return
          el.style.setProperty('--reveal-i', String(staggerIndex(i)))
          el.dataset.reveal = 'in'
          observer.unobserve(el)
        })
      },
      { rootMargin: '0px 0px -8% 0px' },
    )

    const scan = () => {
      document.querySelectorAll<HTMLElement>('[data-reveal=""]').forEach((el) => {
        if (el.getBoundingClientRect().top < window.innerHeight) {
          el.dataset.reveal = 'in'
          return
        }
        el.dataset.reveal = 'wait'
        observer.observe(el)
      })
    }
    // The page streams in (and filtering adds cards): look again whenever new nodes arrive,
    // once per frame. Each element is decided once — `in` or `wait` is never scanned again.
    let frame = requestAnimationFrame(scan)
    const added = new MutationObserver(() => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(scan)
    })
    added.observe(document.body, { childList: true, subtree: true })

    return () => {
      cancelAnimationFrame(frame)
      added.disconnect()
      observer.disconnect()
      // A page left mid-scroll must not keep hidden elements (back/forward cache).
      document.querySelectorAll<HTMLElement>('[data-reveal="wait"]').forEach((el) => {
        el.dataset.reveal = 'in'
      })
    }
  }, [pathname])

  return null
}
