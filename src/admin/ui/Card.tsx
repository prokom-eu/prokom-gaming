import { useId, type ReactNode } from 'react'

import { Spark } from './Spark'

/**
 * Surface of the panel: optional header with title, a muted note and actions on the right. With a
 * title the section is a named region (screen-reader landmarks, e.g. „Ostatnie zapytania”).
 */
export function Card({
  title,
  note,
  actions,
  className,
  children,
}: {
  title?: string
  note?: ReactNode
  actions?: ReactNode
  className?: string
  children: ReactNode
}) {
  const id = useId()
  return (
    <section
      className={className ? `pn-card ${className}` : 'pn-card'}
      aria-labelledby={title ? id : undefined}
    >
      {title ? (
        <div className="pn-card__hd">
          <h2 id={id}>{title}</h2>
          {note ? <p>{note}</p> : null}
          {actions ? <div className="pn-card__r">{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  )
}

/** Number tile (Pulpit, Centrum cen): label, value, note and an optional 30-day line. */
export function Kpi({
  label,
  value,
  note,
  tone,
  spark,
}: {
  label: string
  value: string
  note?: ReactNode
  tone?: 'bad' | 'gold'
  spark?: readonly number[]
}) {
  const cls = ['pn-card', 'pn-kpi', tone ? `pn-kpi--${tone}` : ''].filter(Boolean).join(' ')
  return (
    <div className={cls}>
      <span className="pn-kpi__label">{label}</span>
      <b className="pn-kpi__value">{value}</b>
      {note ? <small className="pn-kpi__note">{note}</small> : null}
      {spark && spark.length > 1 ? <Spark values={spark} /> : null}
    </div>
  )
}
