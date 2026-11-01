'use client'

import { useEffect } from 'react'

/**
 * Sends the browser on to `href` (replacing history) and shows the link meanwhile. A Payload
 * view cannot redirect on the server (`redirect()` gives an empty page — P1), so the `serwis`
 * role reaches its start screen this way (spec §2a pt 3).
 */
export function GoTo({ href, label }: { href: string; label: string }) {
  useEffect(() => {
    window.location.replace(href)
  }, [href])
  return (
    <p className="pn-note">
      <a href={href}>{label}</a>
    </p>
  )
}
