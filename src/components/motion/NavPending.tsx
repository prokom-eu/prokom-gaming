'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useState, type CSSProperties } from 'react'

import { Sigil } from '@/components/Sigil'
import type { MenuCreature } from '@/lib/site'

/** Faster navigations show nothing, so they never flash (runda v3 PREMIUM §2.3 „Ładowanie”). */
const SHOW_AFTER = 300
/** A navigation that never ends (offline, a server error page) must not leave it on screen. */
const GIVE_UP_AFTER = 10_000

/** `from`: the path the visitor is leaving — the sigil belongs to that page only. */
type Pending = { from: string; creature: MenuCreature | null }

/**
 * A slow page change (PREMIUM §2.3 „Ładowanie”): after 300 ms the sigil of the creature you are
 * going to lights up and breathes in its colour (a gold ring for any other page) until the new
 * page is there. Not a `loading.tsx`: a route fallback would replace the page at once on every
 * click — a flash of emptiness on fast navigations — and break the case flying from a list card
 * to the build page (a View Transition needs the new page in the same commit).
 *
 * It starts on a click on a link to another path of this site (or Back/Forward) and ends when
 * the path changes. Reduced motion: the sigil stands still (globals.css).
 */
export function NavPending({ creatures }: { creatures: readonly MenuCreature[] }) {
  const pathname = usePathname()
  const [pending, setPending] = useState<Pending | null>(null)

  useEffect(() => {
    let timer = 0
    let giveUp = 0
    const start = (path: string) => {
      window.clearTimeout(timer)
      window.clearTimeout(giveUp)
      const slug = /^\/zestawy\/([^/]+)$/.exec(path)?.[1]
      const creature = creatures.find((c) => c.slug === slug) ?? null
      // `pathname` is the page being left (this effect belongs to it).
      timer = window.setTimeout(() => setPending({ from: pathname, creature }), SHOW_AFTER)
      giveUp = window.setTimeout(() => setPending(null), GIVE_UP_AFTER)
    }
    const onClick = (event: MouseEvent) => {
      // Capture phase, before React: next/link cancels the click's default to navigate itself.
      if (event.button !== 0) return
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      const link = event.target instanceof Element ? event.target.closest('a[href]') : null
      if (
        !(link instanceof HTMLAnchorElement) ||
        (link.target && link.target !== '_self') ||
        link.hasAttribute('download') ||
        // A link that only opens its menu on the first tap (the rail on a touch screen).
        (link.closest('[data-nav-hold]') && window.matchMedia('(hover: none)').matches)
      )
        return
      const url = new URL(link.href)
      if (url.origin !== window.location.origin || url.pathname === window.location.pathname) return
      start(url.pathname)
    }
    // Back/Forward to another path; a hash link (skip link, rail sections) fires popstate too.
    const onPop = () => {
      if (window.location.pathname !== pathname) start(window.location.pathname)
    }
    window.addEventListener('click', onClick, true)
    window.addEventListener('popstate', onPop)
    return () => {
      window.clearTimeout(timer)
      window.clearTimeout(giveUp)
      window.removeEventListener('click', onClick, true)
      window.removeEventListener('popstate', onPop)
    }
    // A new path: the navigation is over — the cleanup cancels a pending one.
  }, [creatures, pathname])

  // Hidden again as soon as the new path renders (state from the previous path is dropped).
  const [shownOn, setShownOn] = useState(pathname)
  if (shownOn !== pathname) {
    setShownOn(pathname)
    setPending(null)
  }

  // A View Transition holds back the effects of the new page (and so the cleanup of the timer)
  // until its snapshot is taken: a timer firing in that gap sets state for the page already left.
  const shown = pending !== null && pending.from === pathname
  const creature = shown ? pending.creature : null
  return (
    <>
      {/* Always in the DOM, so screen readers announce the text when it appears. No role: pages
          keep their own single status message (forms, the configurator). */}
      <span className="sr-only nav-pending__live" aria-live="polite">
        {shown ? 'Wczytuję stronę…' : ''}
      </span>
      {shown && (
        <div
          className="nav-pending"
          style={creature ? ({ '--c': `var(--c-${creature.slug})` } as CSSProperties) : undefined}
        >
          <span className="nav-pending__mark" aria-hidden="true">
            {creature ? (
              <Sigil id={creature.id} size={64} />
            ) : (
              <span className="nav-pending__ring" />
            )}
          </span>
        </div>
      )}
    </>
  )
}
