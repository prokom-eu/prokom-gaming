import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { connection } from 'next/server'

import { PageHeader } from '@/components/content/PageHeader'
import { StockList } from '@/components/content/StockList'
import { IconClock, IconDoc, IconShield, IconTruck } from '@/components/icons'
import { ButtonLink } from '@/components/ui/Button'
import { getEnv } from '@/lib/env'
import { features } from '@/lib/features'
import { issueFormToken } from '@/lib/inquiry/spam'
import { errorFields, log } from '@/lib/logger'
import { routes } from '@/lib/nav'
import type { StockCard } from '@/lib/stock'
import { loadStockCards } from '@/lib/stock.server'

import '@/components/content/content.css'
import '@/components/content/sale.css'
import '@/components/inquiry/inquiry.css'

export const metadata: Metadata = {
  title: 'Gotowe od ręki',
  description:
    'Komputery do gier złożone, przetestowane i z metryką. Wysyłka w 1–2 dni robocze albo odbiór w sklepie od razu. Rezerwacja na 24 godziny.',
}

const PROMISES = [
  { icon: <IconShield size={18} />, text: 'Pełna gwarancja 2 lata' },
  { icon: <IconDoc size={18} />, text: 'Metryka tego egzemplarza' },
  { icon: <IconTruck size={18} />, text: 'Wysyłka w 1–2 dni robocze' },
  { icon: <IconClock size={18} />, text: 'Rezerwacja na 24 godziny' },
]

/** „Gotowe od ręki” (spec. §11, boards Gotowe / Gotowe-telefon). Hidden until FEATURE_READY. */
export default async function StockPage() {
  // Read per request: the flag, units and reservations, the signed form token (ADR-G005).
  await connection()
  if (!features().ready) notFound()

  let cards: StockCard[] = []
  try {
    cards = await loadStockCards()
  } catch (error) {
    log.error({ ...errorFields(error) }, 'stock page data failed')
  }

  return (
    <>
      <PageHeader
        scene="perun"
        title="Gotowe od ręki"
        lead="Złożone, przetestowane i z metryką. Wysyłamy w 1–2 dni robocze albo odbierasz w sklepie od razu. Dobre, gdy prezent musi być na wczoraj."
      />
      <section className="gt" aria-label="Egzemplarze od ręki">
        <div className="wrap">
          <ul className="gt__promises">
            {PROMISES.map((p) => (
              <li key={p.text}>
                {p.icon}
                {p.text}
              </li>
            ))}
          </ul>
          {cards.length > 0 ? (
            <StockList cards={cards} token={issueFormToken(getEnv().PAYLOAD_SECRET)} />
          ) : (
            // TODO(krystian): text when no unit is on sale (not on the board).
            <p className="ct-p">Teraz nie mamy egzemplarzy od ręki. Zajrzyj tu za kilka dni.</p>
          )}
          <div className="gt__none">
            <div>
              <b className="h">Nie ma tego, czego szukasz?</b>
              <p>
                Daj znać, jaki zestaw Cię interesuje. Napiszemy, gdy pojawi się od ręki, albo
                złożymy go w 5–10 dni roboczych.
              </p>
            </div>
            <ButtonLink href={routes.inquiry} size="lg">
              Powiadom mnie
            </ButtonLink>
          </div>
        </div>
      </section>
    </>
  )
}
