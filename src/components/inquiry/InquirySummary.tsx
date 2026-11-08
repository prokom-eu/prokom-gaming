import { IconClock, IconDoc, IconShield, IconUser } from '@/components/icons'
import { Sigil } from '@/components/Sigil'
import type { Summary } from '@/lib/inquiry/form'
import { zl } from '@/lib/pricing/format'

const PROMISES = [
  { icon: IconClock, text: 'Odpowiedź zwykle w godzinę, codziennie 8–22' },
  { icon: IconShield, text: 'Zapytanie do niczego nie zobowiązuje' },
  { icon: IconDoc, text: 'Płacisz dopiero po akceptacji oferty' },
]

/** „Twoje zapytanie” beside the form (board `.sm6`); on a phone a short card above the steps. */
export function InquirySummary({ summary }: { summary: Summary }) {
  return (
    <div className="iq-sum">
      <h2 className="iq-sum__h">Twoje zapytanie</h2>
      <div className="iq-sum__b" aria-live="polite">
        {summary.key ? (
          <span className="iq-sum__sg" style={{ color: `var(--c-${summary.key})` }}>
            <Sigil id={summary.key} size={58} />
          </span>
        ) : (
          <span className="iq-sum__q" aria-hidden>
            ?
          </span>
        )}
        <span>
          <strong className="iq-sum__t">{summary.title}</strong>
          <small>{summary.sub}</small>
          {summary.price !== null && (
            // Not on the board (spec. §10: „istota/konfiguracja, cena”); a preview, the offer
            // confirms it.
            <span className="iq-sum__price">{zl(summary.price)}</span>
          )}
        </span>
      </div>
      <dl className="iq-sum__rows">
        {summary.rows.map((row) => (
          <div key={row.label}>
            <dt>{row.label}</dt>
            <dd>{row.value}</dd>
          </div>
        ))}
      </dl>
      <ul className="iq-sum__p">
        {PROMISES.map(({ icon: Icon, text }) => (
          <li key={text}>
            <Icon size={18} />
            <span>{text}</span>
          </li>
        ))}
      </ul>
      <div className="iq-sum__w">
        <span className="iq-sum__av" aria-hidden>
          <IconUser size={22} />
        </span>
        <span>
          <b>Odpisze Krystian</b>
          <small>doradca PRO-KOM Gaming</small>
        </span>
      </div>
    </div>
  )
}
