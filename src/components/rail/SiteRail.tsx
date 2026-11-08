'use client'

import dynamic from 'next/dynamic'
import { usePathname } from 'next/navigation'
import { useSyncExternalStore } from 'react'

import { railHidden } from './railConfig'

/** The rail exists from this width up (NAWIGACJA §4); below it is not rendered at all. */
const WIDE = '(min-width: 1400px)'

// The panel's code and styles are a separate chunk, fetched only on a wide window: a phone never
// downloads them (Lighthouse mobile, G15).
const RailPanel = dynamic(() => import('./RailPanel').then((mod) => mod.RailPanel), {
  ssr: false,
})

function subscribeWide(onChange: () => void) {
  const mq = window.matchMedia(WIDE)
  mq.addEventListener('change', onChange)
  return () => mq.removeEventListener('change', onChange)
}

/**
 * Side rail (NAWIGACJA §4, plansza 10 sekcje 2–3): fixed at the left from 1400 px, 64 px wide,
 * opening to 258 px on hover or keyboard focus. Lists the home sections I–XI (the active one
 * marked), „Na tej stronie” on a build page, and the actions: comparison, inquiry, back to top.
 * Not on the certificate (print) or the account pages.
 */
export function SiteRail({ creatures }: { creatures: readonly { slug: string; name: string }[] }) {
  const pathname = usePathname()
  // Server and hydration render nothing; the rail appears right after, only on a wide window.
  const wide = useSyncExternalStore(
    subscribeWide,
    () => window.matchMedia(WIDE).matches,
    () => false,
  )
  if (!wide || railHidden(pathname)) return null
  return <RailPanel key={pathname} pathname={pathname} creatures={creatures} />
}
