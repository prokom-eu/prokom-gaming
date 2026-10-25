import type { Metadata } from 'next'
import Link from 'next/link'

import { Scene } from '@/components/Scene'
import { Sigil } from '@/components/Sigil'
import { ButtonLink } from '@/components/ui/Button'
import { routes } from '@/lib/nav'

// Next adds `noindex` to the not-found page itself.
export const metadata: Metadata = { title: 'Nie ma takiej strony' }

/** 404 (spec. §3, boards 404 / 404-telefon): Licho's scene, 2 buttons and 4 links. */
export default function NotFound() {
  return (
    <section className="e404" data-scene-top>
      <Scene id="licho" fit="wide" eager />
      <div className="e404__veil" aria-hidden="true" />
      <div className="wrap e404__in">
        <span className="e404__sigil" aria-hidden="true">
          <Sigil id="licho" size={120} />
        </span>
        <b className="nm e404__num" aria-hidden="true">
          404
        </b>
        <h1 className="h">
          <span className="sr-only">Błąd 404. </span>Licho tu było i stronę zabrało
        </h1>
        <p>
          Tej strony nie ma albo zmieniła adres. Licho nie śpi, ale my też nie: wracaj do istot.
        </p>
        <div className="e404__actions">
          <ButtonLink href={routes.home} size="lg">
            Strona główna
          </ButtonLink>
          <ButtonLink href={routes.builds} size="lg" variant="ghost">
            Wszystkie zestawy
          </ButtonLink>
        </div>
        <ul className="e404__links">
          <li>
            <Link href={routes.gamePicker}>Dobór pod grę</Link>
          </li>
          <li>
            <Link href={routes.configurator}>Konfigurator</Link>
          </li>
          <li>
            <Link href={routes.faq}>Pytania i odpowiedzi</Link>
          </li>
          <li>
            <Link href={routes.contact}>Kontakt</Link>
          </li>
        </ul>
      </div>
    </section>
  )
}
