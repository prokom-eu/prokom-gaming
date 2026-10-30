import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { connection } from 'next/server'
import { cache, type CSSProperties } from 'react'

import { CertificatePaper } from '@/components/account/CertificatePaper'
import { PrintButton } from '@/components/account/PrintButton'
import { Timeline } from '@/components/account/Timeline'
import { IconDoc, IconShield } from '@/components/icons'
import { ButtonLink } from '@/components/ui/Button'
import { loadCertificate } from '@/lib/certificate.server'
import { routes } from '@/lib/nav'

import '@/components/paper.css'
import '@/components/account/certificate.css'

type Props = { params: Promise<{ kod: string }> }

// One read per request for both the metadata and the page.
const load = cache(loadCertificate)

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  await connection()
  const view = await load(decodeURIComponent((await params).kod))
  // Private by nature (spec. §13): a code from one sticker, never in search results.
  const robots = { index: false, follow: false }
  if (!view) return { robots }
  return { title: `Metryka: ${view.title}`, robots }
}

/**
 * The certificate of one unit (spec. §13, boards Metryka / Metryka-telefon), opened from the QR
 * code on the case. Published units only; an unknown code is a 404. No customer data.
 * Board's temperature chart („wykres przykładowy”) is left out: we store the maxima, not a curve.
 */
export default async function CertificatePage({ params }: Props) {
  await connection()
  const view = await load(decodeURIComponent((await params).kod))
  if (!view) notFound()

  return (
    <section className="mt" style={{ '--c': `var(--c-${view.slug})` } as CSSProperties}>
      <div className="wrap mt__grid">
        <div>
          <h1 className="h mt__title">{view.title}</h1>
          <p className="mt__lead">
            Ta strona otwiera się po zeskanowaniu kodu QR z obudowy. To wyniki tego jednego
            komputera, a nie dane z katalogu.
          </p>
          {view.timeline && <Timeline steps={view.timeline} label="Etap zamówienia" />}

          {(view.stress || view.temps.cpu || view.temps.gpu) && (
            <div className="mt-box cut">
              <h2 className="h">Test obciążeniowy</h2>
              <dl className="mt-kv">
                {view.stress?.minutes && (
                  <div>
                    <dt>Czas</dt>
                    <dd>{view.stress.minutes}</dd>
                  </div>
                )}
                {view.stress?.result && (
                  <div>
                    <dt>Wynik</dt>
                    <dd className={view.stress.ok ? 'ok' : 'bad'}>{view.stress.result}</dd>
                  </div>
                )}
                {view.temps.cpu && (
                  <div>
                    <dt>CPU maks.</dt>
                    <dd>{view.temps.cpu}</dd>
                  </div>
                )}
                {view.temps.gpu && (
                  <div>
                    <dt>GPU maks.</dt>
                    <dd>{view.temps.gpu}</dd>
                  </div>
                )}
              </dl>
            </div>
          )}

          {view.fps.rows.length > 0 && (
            <div className="mt-box cut">
              <h2 className="h">Klatki zmierzone na tym egzemplarzu</h2>
              <p className="mt-box__note">{view.fps.caption}.</p>
              <ul className="mt-fps">
                {view.fps.rows.map((row) => (
                  <li key={row.name}>
                    <span>{row.name}</span>
                    <i aria-hidden="true">
                      <s style={{ width: `${row.percent}%` }} />
                    </i>
                    <b>{row.text}</b>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-box cut">
            <h2 className="h">Części i gwarancje</h2>
            {view.parts.length > 0 && (
              <dl className="mt-parts">
                {view.parts.map((part) => (
                  <div key={part.label}>
                    <dt>{part.label}</dt>
                    <dd>
                      {part.maker}
                      {part.details && <small>{part.details}</small>}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
            <p className="mt-gw">
              <IconShield size={20} />
              <span>
                <b>
                  Gwarancja PRO-KOM na cały komputer: 24 miesiące
                  {view.warrantyUntil ? `, do ${view.warrantyUntil}` : ''}.
                </b>{' '}
                Kurier odbiera od Ciebie na nasz koszt.
              </span>
            </p>
          </div>
        </div>

        <aside className="mt__side" aria-label="Metryka do pobrania">
          <CertificatePaper view={view} />
          <div className="mt__actions">
            <PrintButton>
              <IconDoc size={18} />
              <span>Pobierz metrykę w PDF</span>
            </PrintButton>
            <ButtonLink variant="ghost" href={routes.account}>
              Zgłoś problem z tym komputerem
            </ButtonLink>
          </div>
          {view.assembledBy && (
            <div className="mt-who cut">
              <small>Złożył i przetestował</small>
              <b>{view.assembledBy}</b>
              <span>Serwis PRO-KOM, Rabka-Zdrój{view.testedAt ? `, ${view.testedAt}` : ''}</span>
            </div>
          )}
        </aside>
      </div>
    </section>
  )
}
