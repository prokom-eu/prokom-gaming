import type { ReactNode } from 'react'

import { Icon, type IconName } from './icons'

/** One sentence for an empty list or a missing source (spec §18.2), without decoration. */
export function EmptyState({
  title,
  children,
  icon = 'inbox',
}: {
  title: string
  children?: ReactNode
  icon?: IconName
}) {
  return (
    <div className="pn-empty">
      <Icon name={icon} size={26} />
      <b>{title}</b>
      {children ? <span>{children}</span> : null}
    </div>
  )
}
