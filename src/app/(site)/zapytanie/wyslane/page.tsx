import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { SentSummaryCard } from '@/components/inquiry/SentSummaryCard'
import { Scene } from '@/components/Scene'
import { Sigil } from '@/components/Sigil'
import { HERO_DEFAULT } from '@/lib/home'
import { INQUIRY_NUMBER } from '@/lib/inquiry/form'
import { routes } from '@/lib/nav'
import { company, menuCreatures } from '@/lib/site'

import '@/components/inquiry/inquiry.css'

// A confirmation for one person: never in search results.
export const metadata: Metadata = {
  title: 'Zapytanie wysłane',
  robots: { index: false, follow: false },
}

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> }

const STEPS = [
  { title: 'Teraz', text: 'Zapytanie jest u nas. Kopia poszła na Twój e-mail.', state: 'done' },
  {
    title: 'W ciągu godziny',
    text: 'Krystian odpisze z imienną listą części, ceną i terminem. Codziennie 8–22.',
    state: 'now',
  },
  {
    title: 'Gdy zaakceptujesz',
    text: 'Wystawimy fakturę pro forma. Płacisz przelewem albo BLIK-iem.',
    state: '',
  },
  {
    title: '5–10 dni roboczych',
    text: 'Montaż, test obciążeniowy, pomiary w grach, metryka i wysyłka.',
    state: '',
  },
] as const

/**
 * „Zapytanie wysłane” (spec. §10, boards Zapytanie / Zapytanie-telefon, `stany/tel-12`). The
 * number and the creature come from the address the form sends here; the configuration from this
 * tab's `sessionStorage` (`SentSummaryCard`) — nothing is read from the database by number.
 */
export default async function InquirySentPage({ searchParams }: Props) {
  const { nr, istota } = await searchParams
  if (typeof nr !== 'string' || !INQUIRY_NUMBER.test(nr)) redirect(routes.inquiry)
  // Only a known creature key reaches the file paths of the scene and the sigil.
  const creature = menuCreatures.find((c) => c.id === istota)
  // TODO(krystian): scene for „Pomóżcie mi dobrać” and a custom list (no creature; the board
  // shows only Wampir) — the home page's default creature for now.
  const scene = creature?.id ?? HERO_DEFAULT

  return (
    <>
      <section className="iq-sent" data-scene-top>
        <Scene id={scene} eager />
        <div className="iq-sent__veil" aria-hidden="true" />
        <div className="wrap iq-sent__in">
          <div
            className="iq-seal"
            style={{ ['--seal' as string]: `var(--c-${scene})` }}
            aria-hidden="true"
          >
            {creature && (
              <span className="iq-seal__sg">
                <Sigil id={creature.id} size={120} />
              </span>
            )}
            <span className="iq-seal__ok">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M5 12.5l4.5 4.5L19 7.5" strokeWidth="2.6" strokeLinecap="round" />
              </svg>
            </span>
          </div>
          <h1 className="h">Zapytanie wysłane</h1>
          <p className="iq-sent__lead">
            Dziękujemy. Twój komputer jest już w kolejce do wyceny. Odpiszemy na Twój e-mail zwykle
            w ciągu godziny.
          </p>
          <p className="iq-sent__nr">
            Numer zapytania: <b>{nr}</b>
          </p>
        </div>
      </section>

      <section className="iq-next">
        <div className="wrap iq-next__g">
          <div>
            <h2 className="h">Co będzie dalej</h2>
            <ol className="iq-tl">
              {STEPS.map((step) => (
                <li key={step.title} className={step.state}>
                  <i aria-hidden="true" />
                  <b>{step.title}</b>
                  <p>{step.text}</p>
                </li>
              ))}
            </ol>
          </div>
          <SentSummaryCard number={nr} phone={company.phone} phoneHref={company.phoneHref} />
        </div>
      </section>
    </>
  )
}
