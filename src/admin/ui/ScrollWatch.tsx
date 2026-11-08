'use client'

import { useEffect } from 'react'

/**
 * Phone app bar (spec §2a pt 2): the screen title appears in the bar once the big title in the
 * content has scrolled under it. Sets `pn-scrolled` on the panel root; CSS does the rest
 * (and turns the fade off with reduced motion). No-op on a computer — the bar is hidden.
 */
export function ScrollWatch() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>('[data-panel]')
    const title = root?.querySelector<HTMLElement>('.pn-ph h1')
    if (!root) return
    if (!title) {
      // A screen without a big title: the bar always shows its title.
      root.classList.add('pn-scrolled')
      return
    }
    const bar = Number.parseFloat(getComputedStyle(root).getPropertyValue('--p-appbar-h')) || 56
    const observer = new IntersectionObserver(
      ([entry]) => root.classList.toggle('pn-scrolled', !entry!.isIntersecting),
      { rootMargin: `-${bar}px 0px 0px 0px` },
    )
    observer.observe(title)
    return () => observer.disconnect()
  }, [])
  return null
}
