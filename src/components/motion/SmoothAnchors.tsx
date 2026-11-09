'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef } from 'react'

import { cancelGlide, glideToSection } from '@/lib/glide'
import { prefersReducedMotion } from '@/lib/motion'

/** A page transition (PageTransition) ends by then at the latest; the glide never waits longer. */
const TRANSITION_WAIT_MAX = 1200

/**
 * Smooth travel between sections (runda v3 PREMIUM §2.3, F2): a click on a link to a section of
 * this page — the side rail, links in the text — glides there instead of jumping: a soft start, a
 * long calm landing, 0.5–1.25 s by distance (`lib/smoothScroll`). A link to a section of another
 * page (`/#jak-kupic` from a build page) opens that page first and glides down once its
 * transition has ended.
 *
 * Own loop rather than CSS `scroll-behavior: smooth`: the home sections are `content-visibility:
 * auto`, so their heights are estimates until rendered and the target moves during the trip —
 * the loop measures it again every frame and lands exactly; the browser's own smooth scroll lands
 * beside it, and its curve and duration cannot be set.
 *
 * The wheel, a touch, a key or a click stops the trip at once — nobody fights the page. Left to
 * the browser's own jump: reduced motion, the skip link (`[data-instant]`), and a target it would
 * first have to reveal (inside a closed `<details>`, hidden).
 */
export function SmoothAnchors() {
  const router = useRouter()
  const pathname = usePathname()
  /** A section to glide to once the page just opened is there. */
  const pendingHash = useRef<string | null>(null)

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      // Capture phase, before React: next/link checks `defaultPrevented` and then leaves the
      // navigation to us. No stopPropagation — the link's own handlers (a sheet closing) still run.
      if (event.defaultPrevented || event.button !== 0) return
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      const link = event.target instanceof Element ? event.target.closest('a[href]') : null
      if (
        !(link instanceof HTMLAnchorElement) ||
        (link.target && link.target !== '_self') ||
        link.hasAttribute('download') ||
        link.hasAttribute('data-instant') ||
        // The closed rail on a touch screen: the first tap only opens it (RailPanel).
        (link.closest('[data-nav-hold]') && window.matchMedia('(hover: none)').matches)
      )
        return
      const url = new URL(link.href)
      const id = hashId(url.hash)
      if (url.origin !== window.location.origin || !id || prefersReducedMotion()) return
      pendingHash.current = null

      if (url.pathname === window.location.pathname) {
        // Same path but other query: an ordinary navigation (rare; never a glide).
        if (url.search !== window.location.search) return
        const target = document.getElementById(id)
        if (!target || !glidable(target)) return
        event.preventDefault()
        // `null` state: Next's history patch keeps its own state and learns the new address.
        if (window.location.hash !== url.hash) window.history.pushState(null, '', url.hash)
        glideToSection(target)
        return
      }
      // Another page: open it at its top, then glide (the effect below, once it is there).
      event.preventDefault()
      pendingHash.current = id
      router.push(url.pathname + url.search)
    }
    window.addEventListener('click', onClick, true)
    return () => {
      window.removeEventListener('click', onClick, true)
      cancelGlide()
    }
  }, [router])

  // The page opened for a section is there: wait for its transition to end (a glide during it
  // would move a page the visitor sees only as a snapshot), then glide down.
  useEffect(() => {
    const id = pendingHash.current
    if (!id) return
    pendingHash.current = null
    let cancelled = false
    void transitionEnd().then(() => {
      if (cancelled) return
      window.history.replaceState(null, '', `#${encodeURIComponent(id)}`)
      const target = document.getElementById(id)
      if (!target) return
      if (glidable(target)) glideToSection(target)
      else target.scrollIntoView()
    })
    return () => {
      cancelled = true
    }
  }, [pathname])

  return null
}

function hashId(hash: string): string {
  try {
    return decodeURIComponent(hash.slice(1))
  } catch {
    return ''
  }
}

/** A target the browser would have to reveal first (closed details, hidden) keeps its own jump. */
function glidable(target: HTMLElement): boolean {
  if (target.closest('details:not([open])')) return false
  return typeof target.checkVisibility !== 'function' || target.checkVisibility()
}

/** Resolves when the running page transition has ended (or at once without one). */
function transitionEnd(): Promise<void> {
  return new Promise((resolve) => {
    // Two frames: the new page is laid out and the transition, if any, has started.
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        const running = document
          .getAnimations()
          .filter((a) =>
            (a.effect as KeyframeEffect | null)?.pseudoElement?.startsWith('::view-transition'),
          )
        void Promise.race([
          Promise.all(running.map((a) => a.finished.catch(() => undefined))),
          new Promise((r) => setTimeout(r, TRANSITION_WAIT_MAX)),
        ]).then(() => resolve())
      }),
    )
  })
}
