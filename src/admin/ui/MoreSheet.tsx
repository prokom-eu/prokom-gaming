'use client'

import { useState, type ReactNode } from 'react'

import { BottomSheet } from '../../components/BottomSheet'
import { shortCount } from './count'
import { Icon, type IconName } from './icons'

export type MoreTile = {
  key: string
  label: string
  href: string
  icon: IconName
  count: number
  current: boolean
}

type Props = {
  tiles: MoreTile[]
  /** "Więcej" is the current tab when the screen is one of its tiles. */
  current: boolean
  status: string | null
  marginAlarm: boolean
  queue: number
  who: { name: string; initials: string; role: string }
  logoutHref: string
  /** „Sprawdź ceny” (P7, admin only). */
  action?: ReactNode
}

/**
 * "Więcej" tab and its sheet (spec §2a pt 4, stany/tel-04-wiecej): status of the site and the
 * queue, tiles 3 in a row with counts, the account and "Wyloguj". The sheet is the site's
 * `BottomSheet` (<dialog>: focus kept inside, Esc, tap on the backdrop, drag down; focus goes
 * back to this button) in the panel look.
 */
export function MoreSheet({
  tiles,
  current,
  status,
  marginAlarm,
  queue,
  who,
  logoutHref,
  action,
}: Props) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        className="pn-tab"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-current={current && !open ? 'page' : undefined}
        onClick={() => setOpen(true)}
      >
        <span className="pn-tab__ic">
          <Icon name="menu" size={21} />
        </span>
        Więcej
      </button>
      <BottomSheet
        open={open}
        onClose={() => setOpen(false)}
        label="Więcej"
        closeLabel="Zamknij menu"
        className="pn-sheet"
      >
        {status ? (
          <div className="pn-mstat">
            <span className={marginAlarm ? 'pn-dot pn-dot--bad' : 'pn-dot'} />
            <span className="pn-mstat__text">{status}</span>
            {queue > 0 ? (
              <span className="pn-chip pn-chip--warn">
                <i />
                {queue} do zatw.
              </span>
            ) : null}
          </div>
        ) : null}
        {action ? <div className="pn-maction">{action}</div> : null}
        <h2>Panel</h2>
        <ul className="pn-mgrid">
          {tiles.map((tile) => (
            <li key={tile.key}>
              <a
                className="pn-mtile"
                href={tile.href}
                aria-current={tile.current ? 'page' : undefined}
              >
                <Icon name={tile.icon} size={22} />
                <span>{tile.label}</span>
                {tile.count > 0 ? <em>{shortCount(tile.count)}</em> : null}
              </a>
            </li>
          ))}
          <li>
            <a className="pn-mtile" href="/" target="_blank" rel="noopener">
              <Icon name="external" size={22} />
              <span>
                Strona<span className="pn-sr"> (otwiera się w nowej karcie)</span>
              </span>
            </a>
          </li>
        </ul>
        <div className="pn-mwho">
          <span className="pn-av" aria-hidden="true">
            {who.initials}
          </span>
          <span>
            {who.name}
            <small>{who.role}</small>
          </span>
          <a className="pn-btn pn-btn--sm" href={logoutHref}>
            Wyloguj
          </a>
        </div>
      </BottomSheet>
    </>
  )
}
