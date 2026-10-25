'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { isCurrent, routes } from '@/lib/nav'
import { plural } from '@/lib/pl'

import { IconGamepad, IconMail, IconMenu, IconSliders, IconTower } from './icons'
import { useShell } from './shell/ShellProvider'

/**
 * Bottom tab bar, phone only (≤ 760 px, ADR-G003 §4): Zestawy · Pod grę · Konfigurator (gold
 * circle) · Zapytanie (counter) · Menu. Active tab gold with a bar on top (`aria-current`).
 */
export function MobileTabBar() {
  const pathname = usePathname()
  const { inquiryCount, openMenu, menuOpen } = useShell()
  const current = (href: string) => (isCurrent(pathname, href) ? 'page' : undefined)

  return (
    <nav className="tabbar" aria-label="Nawigacja główna">
      <Link className="tabbar__item" href={routes.builds} aria-current={current(routes.builds)}>
        <IconTower />
        <span>Zestawy</span>
      </Link>
      <Link
        className="tabbar__item"
        href={routes.gamePicker}
        aria-current={current(routes.gamePicker)}
      >
        <IconGamepad />
        <span>Pod grę</span>
      </Link>
      <Link
        className="tabbar__item tabbar__main"
        href={routes.configurator}
        aria-current={current(routes.configurator)}
      >
        <i>
          <IconSliders />
        </i>
        <span>Konfigurator</span>
      </Link>
      <Link className="tabbar__item" href={routes.inquiry} aria-current={current(routes.inquiry)}>
        <IconMail />
        {inquiryCount > 0 && (
          <em className="badge">
            {inquiryCount}
            <span className="sr-only">
              {' '}
              {plural(inquiryCount, ['komputer', 'komputery', 'komputerów'])} w zapytaniu
            </span>
          </em>
        )}
        <span>Zapytanie</span>
      </Link>
      <button
        type="button"
        className="tabbar__item"
        aria-haspopup="dialog"
        aria-expanded={menuOpen}
        aria-controls="menu"
        onClick={openMenu}
      >
        <IconMenu />
        <span>Menu</span>
      </button>
    </nav>
  )
}
