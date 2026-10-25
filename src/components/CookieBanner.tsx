'use client'

import Link from 'next/link'
import { useState, useSyncExternalStore } from 'react'

import { routes } from '@/lib/nav'
import { notifyStorage, readItem, storageKeys, subscribeStorage, writeItem } from '@/lib/storage'

import { Button } from './ui/Button'

type Answer = 'granted' | 'denied'

/**
 * Cookie consent (spec. §3, §24). Rendered only when the site uses tools that need consent
 * (`enabled`, off at launch). "Odrzuć" and "Akceptuję" have equal weight — the same ghost style
 * (spec. §3 wins over the gold "Akceptuję" on the Main board; GDPR: no nudging). The answer is
 * kept in localStorage; G15 decides what "granted" turns on.
 */
export function CookieBanner({ enabled }: { enabled: boolean }) {
  // Server and first render: "answered", so the banner never flashes before hydration.
  const answered = useSyncExternalStore(
    subscribeStorage,
    () => readItem(storageKeys.consent) !== null,
    () => true,
  )
  // Blocked storage cannot remember the answer: the banner still closes for this page view.
  const [dismissed, setDismissed] = useState(false)
  if (!enabled || answered || dismissed) return null

  function answer(value: Answer) {
    setDismissed(true)
    if (writeItem(storageKeys.consent, value)) notifyStorage()
  }

  return (
    <section className="ckb" aria-labelledby="ckb-title">
      <div>
        <h2 id="ckb-title">Ciasteczka, ale bez podstępu</h2>
        <p>
          Niezbędne działają zawsze. Analityczne i marketingowe włączymy tylko, jeśli się zgodzisz.{' '}
          <Link href={`${routes.privacy}#cookies`}>Szczegóły i ustawienia</Link>
        </p>
      </div>
      <div className="ckb__actions">
        <Button variant="ghost" onClick={() => answer('denied')}>
          Odrzuć
        </Button>
        <Button variant="ghost" onClick={() => answer('granted')}>
          Akceptuję
        </Button>
      </div>
    </section>
  )
}
