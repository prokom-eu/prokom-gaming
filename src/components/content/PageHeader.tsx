import type { ReactNode } from 'react'

import { Scene } from '@/components/Scene'

type Props = {
  /** Scene key in /public/scenes (boards: a creature per page). */
  scene: string
  title: ReactNode
  lead?: ReactNode
  /** Above the title (breadcrumbs of a guide). */
  before?: ReactNode
  /** Extra content under the lead (buttons, author line). */
  children?: ReactNode
  /**
   * `tall`: more room below the lead for cards over its edge (Kontakt); `hero`: big header
   * (O nas); `article`: a guide, longer title.
   */
  size?: 'default' | 'tall' | 'hero' | 'article'
}

/**
 * Header of the content pages (boards FAQ, Kontakt, OFirmie, Poradniki, Regulamin, Prywatnosc:
 * `.hd6.hdl`): a creature scene behind a veil that darkens the text side, title and lead at the
 * bottom. The scene is eager — it is the first thing on the page, like the 404 page.
 */
export function PageHeader({ scene, title, lead, before, children, size = 'default' }: Props) {
  return (
    <header className={size === 'default' ? 'ct-head' : `ct-head ct-head--${size}`} data-scene-top>
      <Scene id={scene} fit="wide" eager />
      <div className="ct-head__veil" aria-hidden="true" />
      <div className="wrap ct-head__in">
        {before}
        <h1 className="h ct-head__title">{title}</h1>
        {lead && <p className="ct-head__lead">{lead}</p>}
        {children}
      </div>
    </header>
  )
}
