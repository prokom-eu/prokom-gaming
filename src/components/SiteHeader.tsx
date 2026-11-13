'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

import { headerLinks, isCurrent, routes } from '@/lib/nav'
import { NAV_SCROLL_START, navScrollAt, navScrollState } from '@/lib/navScroll'
import { plural } from '@/lib/pl'

import { railHidden } from './rail/railConfig'
import { IconArrow, IconBars, IconClock, IconSearch, IconUser } from './icons'
import { Logo } from './Logo'
import { useShell } from './shell/ShellProvider'
import { ButtonLink } from './ui/Button'

/**
 * The header follows the scroll on every width (ADR-G012 pkt 2, decision 05.11): glass from
 * 80 px, hidden while scrolling down, back on the way up.
 */
function useNavScroll() {
  const [state, setState] = useState(NAV_SCROLL_START)

  useEffect(() => {
    let frame = 0
    const onScroll = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => setState((s) => navScrollState(s, window.scrollY)))
    }
    // A reload in the middle of the page starts as visible glass, not hidden.
    frame = requestAnimationFrame(() => setState(navScrollAt(window.scrollY)))
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
    }
  }, [])

  return [state, () => setState((s) => ({ ...s, hidden: false }))] as const
}

/**
 * Site header (NAWIGACJA.md §2, §6). Desktop: mark, the 7 links in a capsule, „Odpowiadamy w
 * godzinę”, comparison and account, „Dobierz komputer”. 761–1199: the same without the capsule,
 * with a hamburger opening the menu panel. Phone: mark, comparison and account — the rest is in
 * the tab bar. Widths are CSS-only.
 */
/** `hours`: „codziennie 9–22” from the panel settings (lib/responseHours.server.ts). */
export function SiteHeader({ hours }: { hours: string }) {
  const pathname = usePathname()
  const { compareCount, compareBump, openMenu, menuOpen, openSearch } = useShell()
  const [{ top, scrolled, hidden }, show] = useNavScroll()

  const compareLabel =
    compareCount > 0
      ? `Porównanie, ${compareCount} ${plural(compareCount, ['zestaw', 'zestawy', 'zestawów'])}`
      : 'Porównanie'

  return (
    <header
      className="nav"
      data-hidden={hidden && !menuOpen}
      data-top={top}
      data-scrolled={scrolled}
      // A keyboard user tabbing into a hidden header gets it back.
      onFocus={show}
    >
      <Logo />
      <nav className="nav__caps" aria-label="Główne">
        <ul>
          {headerLinks.map(({ href, label }) => (
            <li key={href}>
              <Link href={href} aria-current={isCurrent(pathname, href) ? 'page' : undefined}>
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <Link className="nav__phone" href={routes.inquiry}>
        <IconClock size={20} />
        <span>
          Odpowiadamy w godzinę <em>{hours}</em>
        </span>
      </Link>
      {/* Search up to 1399 px; from 1400 the side rail has it (NAWIGACJA §5). */}
      <button
        type="button"
        // Pages without the rail keep the magnifier on wide screens too (known from the path, so
        // the server HTML is already right — no jump when the rail loads).
        className={railHidden(pathname) ? 'ico nav__search nav__search--always' : 'ico nav__search'}
        onClick={openSearch}
        aria-label="Szukaj"
      >
        <IconSearch size={18} />
      </button>
      <Link className="ico" href={routes.compare} aria-label={compareLabel} data-fly="compare">
        <IconBars size={18} />
        {compareCount > 0 && (
          // Keyed by the bump: a new key replays the jump (globals.css `.is-bump`).
          <em
            key={compareBump}
            className={compareBump ? 'badge is-bump' : 'badge'}
            aria-hidden="true"
          >
            {compareCount}
          </em>
        )}
      </Link>
      <Link className="ico" href={routes.account} aria-label="Moje konto">
        <IconUser size={18} />
      </Link>
      <ButtonLink className="nav__cta" href={routes.configurator}>
        Dobierz komputer
        <IconArrow size={17} strokeWidth={2.2} />
      </ButtonLink>
      <button
        type="button"
        className="burg"
        aria-label="Otwórz menu"
        aria-haspopup="dialog"
        aria-expanded={menuOpen}
        aria-controls="menu"
        onClick={openMenu}
      >
        <i />
        <i />
        <i />
      </button>
    </header>
  )
}
