'use client'

import { useEffect } from 'react'

import { withoutThemeParam } from '@/lib/themeParam'

/**
 * Takes `?motyw=` (a link from another PRO-KOM line, ADR-028 in prokom-web) out of the address bar
 * after hydration. Gaming is dark only (MOTYW-PASEK-LINII §5), so the value is not stored.
 * Native `history.replaceState` — Next.js syncs it with its router (docs: „Native History API”,
 * 01-app/01-getting-started/04-linking-and-navigating.md) without fetching the page again, which
 * `router.replace` would. Deferred by a task, so the router has finished its own first update.
 */
export function ThemeParamCleanup() {
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const clean = withoutThemeParam(window.location.href)
      if (clean !== null) window.history.replaceState(null, '', clean)
    }, 0)
    return () => window.clearTimeout(timer)
  }, [])
  return null
}
