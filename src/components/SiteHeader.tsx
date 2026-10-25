'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

import { headerLinks, isCurrent, routes } from '@/lib/nav'
import { plural } from '@/lib/pl'

import { IconBars, IconClock, IconUser } from './icons'
import { Logo } from './Logo'
import { useShell } from './shell/ShellProvider'
import { ButtonLink } from './ui/Button'

// Scroll this far before the phone header hides; smaller jitters are ignored.
const HIDE_AFTER = 80
const JITTER = 4

/** Phone header hides on scroll down and returns on scroll up (ADR-G003 §4). */
function useHideOnScroll() {
  const [state, setState] = useState({ hidden: false, top: true })
  const last = useRef(0)

  useEffect(() => {
    let frame = 0
    const onScroll = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const y = window.scrollY
        const delta = y - last.current
        if (Math.abs(delta) < JITTER) return
        last.current = y
        setState({ hidden: delta > 0 && y > HIDE_AFTER, top: y < 8 })
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
    }
  }, [])

  return [state, () => setState((s) => ({ ...s, hidden: false }))] as const
}

/**
 * Site header (spec. §3). Desktop: mark, 7 links, comparison and account icons, "Dobierz
 * komputer". Tablet (761–1000): the same with a hamburger opening the menu panel. Phone: mark,
 * comparison and account only — the rest is in the tab bar. Hiding is CSS-only below 761 px.
 */
export function SiteHeader() {
  const pathname = usePathname()
  const { compareCount, openMenu, menuOpen } = useShell()
  const [{ hidden, top }, show] = useHideOnScroll()

  const compareLabel =
    compareCount > 0
      ? `Porównanie, ${compareCount} ${plural(compareCount, ['zestaw', 'zestawy', 'zestawów'])}`
      : 'Porównanie'

  return (
    <header
      className="nav"
      data-hidden={hidden && !menuOpen}
      data-top={top}
      // A keyboard user tabbing into a hidden header gets it back.
      onFocus={show}
    >
      <Logo />
      <nav aria-label="Główne">
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
      <span className="nav__sp" />
      <Link className="nav__phone" href={routes.inquiry}>
        <IconClock size={16} />
        Odpowiadamy w godzinę
      </Link>
      <Link className="ico" href={routes.compare} aria-label={compareLabel}>
        <IconBars size={18} />
        {compareCount > 0 && (
          <em className="badge" aria-hidden="true">
            {compareCount}
          </em>
        )}
      </Link>
      <Link className="ico" href={routes.account} aria-label="Moje konto">
        <IconUser size={18} />
      </Link>
      <ButtonLink href={routes.configurator}>Dobierz komputer</ButtonLink>
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
