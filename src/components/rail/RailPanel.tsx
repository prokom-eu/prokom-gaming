'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react'

import { useShell } from '@/components/shell/ShellProvider'
import { glideToTop } from '@/lib/glide'
import { prefersReducedMotion } from '@/lib/motion'
import { routes } from '@/lib/nav'

import {
  activeIndex,
  HOME_SECTIONS,
  pageGroup,
  RAIL_ICONS,
  RING,
  ringOffset,
  scrollProgress,
  type RailIcon,
  type RailSection,
} from './railConfig'
import './rail.css'

const OPEN_DELAY = 120
const CLOSE_DELAY = 250
/** One empty list for pages without a group (a fresh `[]` would re-run the measuring effect). */
const NONE: readonly RailSection[] = []

type Measure = { present: Set<string>; active: string | null; progress: number; down: boolean }

/** The rail itself (NAWIGACJA §4), loaded only on a wide window — see `SiteRail`. */
export function RailPanel({
  pathname,
  creatures,
}: {
  pathname: string
  creatures: readonly { slug: string; name: string }[]
}) {
  const { compareCount, compareBump, openSearch } = useShell()
  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)
  const isHome = pathname === routes.home
  const names = useMemo(() => new Map(creatures.map((c) => [c.slug, c.name])), [creatures])
  const group = pageGroup(pathname, names)
  // The sections whose position decides the active entry: the home sections on the home page,
  // the page's own group elsewhere (home entries are then plain links, never active).
  const tracked: readonly RailSection[] = isHome ? HOME_SECTIONS : (group?.sections ?? NONE)

  const [open, setOpen] = useState(false)
  const [homeListOpen, setHomeListOpen] = useState(false)
  const [m, setM] = useState<Measure>({
    present: new Set(),
    active: null,
    progress: 0,
    down: false,
  })
  const nav = useRef<HTMLElement>(null)
  const timer = useRef(0)

  // Positions are read in an animation frame (on scroll, resize and once after mount): which
  // sections the page really has, the active one, and how far the page is scrolled.
  useEffect(() => {
    let frame = 0
    const measure = () => {
      frame = 0
      const els = tracked
        .map((s) => document.getElementById(s.id))
        .filter((el): el is HTMLElement => el !== null)
      const tops = els.map((el) => el.getBoundingClientRect().top)
      const index = activeIndex(tops, window.innerHeight * 0.4)
      const next: Measure = {
        present: new Set(els.map((el) => el.id)),
        active: index >= 0 ? els[index].id : null,
        progress: scrollProgress(
          window.scrollY,
          document.documentElement.scrollHeight,
          window.innerHeight,
        ),
        down: window.scrollY >= window.innerHeight * 0.3,
      }
      // Most scroll frames change nothing the rail shows: keep the old state, no re-render.
      setM((prev) => (sameMeasure(prev, next) ? prev : next))
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure)
    }
    schedule()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
    }
  }, [tracked])

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const later = (value: boolean, delay: number) => {
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setOpen(value), delay)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape') {
      window.clearTimeout(timer.current)
      setOpen(false)
      return
    }
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
    const items = [...(nav.current?.querySelectorAll<HTMLElement>('a, button') ?? [])]
    const index = items.indexOf(document.activeElement as HTMLElement)
    if (index < 0) return
    event.preventDefault()
    const next = (index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length
    items[next]?.focus()
  }

  // A touch screen has no hover: the first tap opens the rail, the next one follows the link.
  const onClickCapture = (event: MouseEvent<HTMLElement>) => {
    if (open || !window.matchMedia('(hover: none)').matches) return
    event.preventDefault()
    event.stopPropagation()
    setOpen(true)
  }

  const toTop = () => {
    const calm = prefersReducedMotion()
    // The button disappears at the top: hand focus to the first entry, so the keyboard keeps its
    // place instead of falling back to the page start.
    nav.current?.querySelector<HTMLElement>('.rail__cta')?.focus({ preventScroll: true })
    if (calm) window.scrollTo(0, 0)
    else glideToTop()
  }

  const groupSections = group?.sections.filter((s) => m.present.has(s.id)) ?? []

  return (
    <nav
      ref={nav}
      className="rail"
      data-open={open}
      // Closed on a touch screen, the first tap only opens it (NavPending must not start).
      data-nav-hold={open ? undefined : ''}
      aria-label="Sekcje strony"
      onMouseEnter={() => later(true, OPEN_DELAY)}
      onMouseLeave={() => {
        // A mouse click leaves focus on the link: stay open only for keyboard focus.
        if (!nav.current?.querySelector(':focus-visible')) later(false, CLOSE_DELAY)
      }}
      onFocus={() => later(true, OPEN_DELAY)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          later(false, CLOSE_DELAY)
        }
      }}
      onKeyDown={onKeyDown}
      onClickCapture={onClickCapture}
    >
      {/* Search at the top of the rail (NAWIGACJA §4.2 pt 1). „Szukaj” + the shortcut fit the open
          rail; the full name stays for screen readers and in the dialog (runda v3 §1.3). */}
      <button type="button" className="rail__cta" onClick={openSearch}>
        <RailSvg icon="szukaj" />
        <span className="rail__lbl">
          Szukaj<span className="sr-only"> zestawu lub gry</span>
        </span>
        <kbd className="rail__kbd rail__lbl" aria-hidden="true">
          {isMac ? '⌘K' : 'Ctrl K'}
        </kbd>
      </button>

      <div className="rail__scroll">
        {group && groupSections.length > 0 && (
          <>
            <p className="rail__cap rail__cap--page">
              <span className="rail__lbl">{group.title}</span>
            </p>
            {groupSections.map((s) => (
              <RailLink
                key={s.id}
                href={`#${s.id}`}
                icon={s.icon}
                label={s.label}
                active={m.active === s.id}
              />
            ))}
          </>
        )}

        <p className="rail__cap">
          <span className="rail__lbl">Strona główna</span>
        </p>
        {group ? (
          <>
            <button
              type="button"
              className="rail__item"
              aria-expanded={homeListOpen}
              aria-controls="rail-home-sections"
              onClick={() => setHomeListOpen((v) => !v)}
            >
              <RailSvg icon="start" />
              <span className="rail__lbl">Sekcje strony głównej</span>
              <span className="rail__num rail__lbl">
                I–XI <span aria-hidden="true">{homeListOpen ? '▴' : '▾'}</span>
              </span>
            </button>
            <div id="rail-home-sections" className="rail__group" hidden={!homeListOpen}>
              {homeListOpen && <HomeLinks prefix="/" active={null} />}
            </div>
          </>
        ) : (
          <HomeLinks prefix={isHome ? '' : '/'} active={isHome ? m.active : null} />
        )}

        <span className="rail__sep" aria-hidden="true" />

        <Link
          className="rail__item rail__item--action"
          href={routes.compare}
          data-fly="compare"
          aria-label={compareCount > 0 ? `Porównanie, ${compareCount} w porównaniu` : 'Porównanie'}
        >
          <RailSvg icon="porownaj" />
          <span className="rail__lbl">Porównanie</span>
          {compareCount > 0 && (
            <span
              key={compareBump}
              className={compareBump ? 'rail__badge is-bump' : 'rail__badge'}
              aria-hidden="true"
            >
              {compareCount}
            </span>
          )}
        </Link>
        <Link className="rail__item rail__item--action" href={routes.inquiry}>
          <RailSvg icon="napisz" />
          <span className="rail__lbl">Zapytanie</span>
        </Link>
        {m.down && (
          <button
            type="button"
            className="rail__item rail__item--action"
            onClick={toTop}
            aria-label={`Do góry, przewinięto ${m.progress}%`}
          >
            <span className="rail__ring" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <circle className="rail__ring-track" cx="12" cy="12" r="10" />
                <circle
                  className="rail__ring-bar"
                  cx="12"
                  cy="12"
                  r="10"
                  strokeDasharray={RING}
                  strokeDashoffset={ringOffset(m.progress)}
                />
              </svg>
              <svg className="rail__ring-arrow" viewBox="0 0 24 24">
                <path d="M12 16V8M8.5 11.5L12 8l3.5 3.5" />
              </svg>
            </span>
            <span className="rail__lbl">Do góry</span>
            <span className="rail__num rail__lbl">{m.progress}%</span>
          </button>
        )}
      </div>
    </nav>
  )
}

function sameMeasure(a: Measure, b: Measure): boolean {
  return (
    a.active === b.active &&
    a.progress === b.progress &&
    a.down === b.down &&
    a.present.size === b.present.size &&
    [...a.present].every((id) => b.present.has(id))
  )
}

function HomeLinks({ prefix, active }: { prefix: string; active: string | null }) {
  return HOME_SECTIONS.map((s) => (
    <RailLink
      key={s.id}
      href={`${prefix}#${s.id}`}
      icon={s.icon}
      label={s.label}
      roman={s.roman}
      active={active === s.id}
    />
  ))
}

function RailLink({
  href,
  icon,
  label,
  roman,
  active,
}: {
  href: string
  icon: RailIcon
  label: string
  roman?: string
  active: boolean
}) {
  const inner = (
    <>
      <RailSvg icon={icon} />
      <span className="rail__lbl">{label}</span>
      {roman && <span className="rail__num rail__lbl">{roman}</span>}
    </>
  )
  // Another page (`/#id`): client navigation; the same page (`#id`): a plain anchor jump.
  return href.startsWith('/') ? (
    <Link className="rail__item" href={href}>
      {inner}
    </Link>
  ) : (
    <a
      className="rail__item"
      href={href}
      aria-current={active ? 'location' : undefined}
      data-active={active || undefined}
    >
      {inner}
    </a>
  )
}

function RailSvg({ icon }: { icon: RailIcon }) {
  return (
    <svg className="rail__ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d={RAIL_ICONS[icon]} />
    </svg>
  )
}
