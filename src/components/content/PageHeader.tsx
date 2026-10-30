import type { ReactNode } from 'react'

import { Scene } from '@/components/Scene'

type Props = {
  /** Scene key in /public/scenes (boards: a creature per page). */
  scene: string
  title: ReactNode
  lead?: ReactNode
  /** Extra content under the lead (buttons, notice). */
  children?: ReactNode
  /** `tall`: more room below the lead for cards over its edge (Kontakt); `hero`: big header (O nas). */
  size?: 'default' | 'tall' | 'hero'
}

/**
 * Header of the content pages (boards FAQ, Kontakt, OFirmie, Poradniki, Regulamin, Prywatnosc:
 * `.hd6.hdl`): a creature scene behind a veil that darkens the text side, title and lead at the
 * bottom. The scene is eager — it is the first thing on the page, like the 404 page.
 */
export function PageHeader({ scene, title, lead, children, size = 'default' }: Props) {
  return (
    <header className={size === 'default' ? 'ct-head' : `ct-head ct-head--${size}`} data-scene-top>
      <Scene id={scene} fit="wide" eager />
      <div className="ct-head__veil" aria-hidden="true" />
      <div className="wrap ct-head__in">
        <h1 className="h ct-head__title">{title}</h1>
        {lead && <p className="ct-head__lead">{lead}</p>}
        {children}
      </div>
    </header>
  )
}
