import Image from 'next/image'

import type { CertificateView } from '@/lib/certificate'

/**
 * The certificate on paper (board Metryka `.doc`, styles `components/paper.css`): the same look as
 * the sample on the home page, with this unit's numbers. Rows without data are left out.
 */
export function CertificatePaper({ view }: { view: CertificateView }) {
  const stress = view.stress && [view.stress.minutes, view.stress.result].filter(Boolean).join(', ')
  const temps = [
    view.temps.cpu && `CPU ${view.temps.cpu}`,
    view.temps.gpu && `GPU ${view.temps.gpu}`,
  ]
    .filter(Boolean)
    .join(', ')
  // Board: graphics card and processor with serial numbers, then the warranty.
  const parts = view.parts.slice(0, 2)
  return (
    <figure className="hm-doc" aria-label={`Metryka komputera ${view.name}`}>
      <div className="hm-doc__head">
        <span>
          <small>Metryka komputera</small>
          <strong className="nm">{view.name}</strong>
          {view.subtitle && <em>{view.subtitle}</em>}
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
          <dd>
            {view.assembledBy ? `${view.assembledBy}, Rabka-Zdrój` : 'Serwis PRO-KOM, Rabka-Zdrój'}
          </dd>
        </div>
        {view.testedAt && (
          <div>
            <dt>Data testu</dt>
            <dd>{view.testedAt}</dd>
          </div>
        )}
        {stress && (
          <div>
            <dt>Test obciążeniowy</dt>
            <dd>{stress}</dd>
          </div>
        )}
        {temps && (
          <div>
            <dt>Temperatury maks.</dt>
            <dd>{temps}</dd>
          </div>
        )}
      </dl>
      {view.fps.rows.length > 0 && (
        <div className="hm-doc__fps">
          <small>Klatki zmierzone na tym egzemplarzu, {view.fps.resolution}</small>
          {view.fps.rows.map((row) => (
            <p key={row.name}>
              <span>{row.name}</span>
              <i aria-hidden="true">
                <s style={{ width: `${row.percent}%` }} />
              </i>
              <b>{row.text}</b>
            </p>
          ))}
        </div>
      )}
      <ul className="hm-doc__parts">
        {parts.map((part, i) => (
          <li key={`${i}-${part.label}`}>
            <span>{part.maker ? `${part.label}, ${part.maker}` : part.label}</span>
            {part.serial && <em>SN {part.serial}</em>}
          </li>
        ))}
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
