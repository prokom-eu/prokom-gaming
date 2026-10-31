import type { ReactNode } from 'react'

import { Icon } from './icons'

/** Banner for what needs attention now (bad) or a confirmation (ok), with actions. */
export function Alert({
  tone = 'bad',
  title,
  children,
  actions,
}: {
  tone?: 'bad' | 'ok'
  title: string
  children?: ReactNode
  actions?: ReactNode
}) {
  return (
    <div
      className={tone === 'ok' ? 'pn-alert pn-alert--ok' : 'pn-alert'}
      role={tone === 'bad' ? 'alert' : 'status'}
    >
      <span className="pn-alert__ic">
        <Icon name={tone === 'ok' ? 'shield' : 'alert'} size={22} />
      </span>
      <div className="pn-alert__tx">
        <h2>{title}</h2>
        {children ? <p>{children}</p> : null}
      </div>
      {actions ? <div className="pn-alert__acts">{actions}</div> : null}
    </div>
  )
}
