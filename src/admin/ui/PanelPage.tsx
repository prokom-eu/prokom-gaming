import type { ReactNode } from 'react'

/**
 * Screen header (panel spec §2): title (28 px; 31 px on a phone, iOS-style large title that the
 * app bar picks up after scrolling), a lead line and the screen's actions.
 */
export function PanelPage({
  title,
  lead,
  actions,
  children,
}: {
  title: string
  lead?: ReactNode
  actions?: ReactNode
  children?: ReactNode
}) {
  return (
    <>
      <div className="pn-ph">
        <div>
          <h1>{title}</h1>
          {lead ? <p>{lead}</p> : null}
        </div>
        {actions ? <div className="pn-ph__acts">{actions}</div> : null}
      </div>
      {children}
    </>
  )
}
