import Image from 'next/image'
import Link from 'next/link'
import type { ReactNode } from 'react'

import { sourceOf } from '@/lib/fps'
import type { MetricSample } from '@/lib/home'

const icon = (children: ReactNode) => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {children}
  </svg>
)

/** Five stages (spec. §4 pt 7, texts and icons from board Main `.proc`). */
const STAGES = [
  {
    title: 'Części',
    text: 'Zamawiamy je pod Twoje zamówienie, z fakturą i numerami seryjnymi.',
    icon: icon(<path d="M4 9l2-5h12l2 5M4 9v11h16V9M4 9h16M9 20v-6h6v6" />),
  },
  {
    title: 'Montaż',
    text: 'Serwisant składa komputer ręcznie i porządnie układa kable.',
    icon: icon(
      <>
        <rect x="6" y="6" width="12" height="12" rx="2" />
        <path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4" />
      </>,
    ),
  },
  {
    title: 'Test obciążeniowy',
    text: 'Procesor i karta pod pełnym obciążeniem. Sprawdzamy temperatury i stabilność.',
    icon: icon(<path d="M12 3c1 4 5 5 5 10a5 5 0 01-10 0c0-3 2-4 2-7 2 1 3 3 3 5 1-2 0-5 0-8z" />),
  },
  {
    title: 'Pomiar klatek',
    text: 'Mierzymy klatki w grach na tym jednym egzemplarzu.',
    icon: icon(<path d="M6 20V10M12 20V4M18 20v-7" />),
  },
  {
    title: 'Metryka i wysyłka',
    text: 'Dostajesz dokument z wynikami. Kurier z ubezpieczeniem albo odbiór w sklepie.',
    icon: icon(
      <>
        <path d="M3 7h11v9H3zM14 10h4l3 3v3h-7" />
        <circle cx="7" cy="18" r="2" />
        <circle cx="17" cy="18" r="2" />
      </>,
    ),
  },
] as const

/**
 * People from the board. TODO(krystian): "[imię serwisanta] — składa i testuje" comes back once
 * the technician agrees to be named (open question [SZEF]).
 */
const PEOPLE = [
  { name: 'Krystian Potaczek', role: 'odpowiada na zapytania' },
  { name: 'Tadeusz Wójciak', role: 'prowadzi PRO-KOM od 2004' },
] as const

/** "Zanim komputer wyjedzie z Rabki" (spec. §4 pt 7). */
export function BeforeShipping({ metric }: { metric: MetricSample | null }) {
  return (
    <section className="hm-sec hm-proc" aria-labelledby="proc-title">
      <div className="wrap hm-proc__grid">
        <div>
          <h2 id="proc-title" className="h">
            Zanim komputer wyjedzie z Rabki
          </h2>
          <p className="hm-lead">
            Nie wysyłamy pudełek z magazynu. Każdy komputer przechodzi przez ręce konkretnych ludzi
            w Rabce i wyjeżdża z metryką: dokumentem, który mówi, jak naprawdę działa ten jeden
            egzemplarz.
          </p>
          <ol className="hm-proc__steps">
            {STAGES.map((stage, i) => (
              <li key={stage.title}>
                <span className="hm-proc__icon">{stage.icon}</span>
                <div>
                  <b>
                    <em>{String(i + 1).padStart(2, '0')}</em>
                    {stage.title}
                  </b>
                  <p>{stage.text}</p>
                </div>
              </li>
            ))}
          </ol>
          <ul className="hm-proc__people">
            {PEOPLE.map((person) => (
              <li key={person.name}>
                <span className="hm-proc__avatar" aria-hidden="true">
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="8" r="4" />
                    <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
                  </svg>
                </span>
                <span>
                  <b>{person.name}</b>
                  {person.role}
                </span>
              </li>
            ))}
          </ul>
          <Link className="lnk hm-proc__more" href="/o-nas">
            Poznaj nas i warsztat
          </Link>
        </div>

        <div className="hm-proc__side">
          {metric && <MetricPaper metric={metric} />}
          {/* TODO(G14): "W warsztacie teraz: N komputerów" from `GET /api/warsztat`. */}
          <Link className="lnk hm-proc__see" href="/metryka">
            Zobacz metrykę
          </Link>
        </div>
      </div>
    </section>
  )
}

/**
 * Sample certificate on paper (board Main `.doc`). The build's stored numbers with their source
 * and public part classes only — maker, model and serial numbers are on the real certificate
 * (G14). TODO(krystian): confirm the sample wording ("Wzór metryki", assembly and test lines).
 */
function MetricPaper({ metric }: { metric: MetricSample }) {
  const kinds = [...new Set(metric.rows.map((r) => r.kind))]
  // One source for all three rows (the usual case) goes in the caption, else next to each number.
  const common = kinds.length === 1 ? sourceOf(kinds[0]).label : null
  return (
    <figure className="hm-doc" aria-label={`Wzór metryki komputera ${metric.name}`}>
      <div className="hm-doc__head">
        <span>
          <small>Metryka komputera</small>
          <strong className="nm">{metric.name}</strong>
          <em>Wzór metryki, Moc {metric.tierRoman}</em>
        </span>
        <svg
          className="hm-doc__qr"
          width="64"
          height="64"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="3" y="3" width="7" height="7" />
          <rect x="14" y="3" width="7" height="7" />
          <rect x="3" y="14" width="7" height="7" />
          <path d="M14 14h3v3h-3zM18 18h3v3h-3zM14 20h2" />
        </svg>
      </div>
      <dl className="hm-doc__grid">
        <div>
          <dt>Złożył i przetestował</dt>
          <dd>Serwis PRO-KOM, Rabka-Zdrój</dd>
        </div>
        <div>
          <dt>Data testu</dt>
          <dd>przed wysyłką</dd>
        </div>
        <div>
          <dt>Test obciążeniowy</dt>
          <dd>60 min, bez błędów</dd>
        </div>
        <div>
          <dt>Temperatury maks.</dt>
          <dd>CPU i GPU pod obciążeniem</dd>
        </div>
      </dl>
      {metric.rows.length > 0 && (
        <div className="hm-doc__fps">
          <small>Klatki w 2K{common && `, ${common}`}</small>
          {metric.rows.map((row) => (
            <p key={row.name}>
              <span>{row.name}</span>
              <i aria-hidden="true">
                <s style={{ width: `${row.percent}%` }} />
              </i>
              <b>
                {row.text}
                {!common && <small> ({sourceOf(row.kind).label})</small>}
              </b>
            </p>
          ))}
        </div>
      )}
      <ul className="hm-doc__parts">
        {metric.gpu && (
          <li>
            <span>Karta graficzna {metric.gpu}</span>
            <em>z numerem seryjnym</em>
          </li>
        )}
        {metric.cpu && (
          <li>
            <span>Procesor {metric.cpu}</span>
            <em>z numerem seryjnym</em>
          </li>
        )}
        <li>
          <span>Gwarancja PRO-KOM na cały komputer</span>
          <em>24 miesiące</em>
        </li>
      </ul>
      <Image
        className="hm-doc__seal"
        src="/home/seal.svg"
        alt=""
        width={130}
        height={130}
        unoptimized
      />
    </figure>
  )
}
