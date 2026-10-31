import type { PayloadRequest } from 'payload'
import type { ReactNode } from 'react'

import { loadShell, roleLabel, type ShellData } from '../shell/load'
import { navGroups, navMore, navTabs, type NavItem, type NavKey } from '../shell/navModel'
import { shortCount } from './count'
import { Icon } from './icons'
import { MoreSheet, type MoreTile } from './MoreSheet'
import { ScrollWatch } from './ScrollWatch'

type Crumb = { label: string; href?: string }

type Props = {
  req: PayloadRequest
  /** The screen's place in the navigation (highlighted in the sidebar, tabs and sheet). */
  active?: NavKey
  /** Screen title: breadcrumb and the phone's app bar (spec §2a pt 2). */
  title: string
  /** Breadcrumbs between "Panel" and the title, e.g. the group. */
  crumbs?: Crumb[]
  /** "Wstecz" on detail screens (spec §2a pt 2). */
  back?: { href: string; label: string }
  children: ReactNode
}

/**
 * Frame of every custom panel view (panel spec §2, §2a): sidebar and top bar on a computer;
 * app bar, bottom tabs and the "Więcej" sheet on a phone. One markup, the mode is CSS
 * (`panel.css`, ≤ 760 px). Payload renders custom views without its own nav and header, so this
 * is the whole chrome. Call only after `panelAccess` passed — it reads counts.
 */
export async function PanelShell({ req, active, title, crumbs = [], back, children }: Props) {
  const admin = req.payload.config.routes.admin
  const href = (item: NavItem) => `${admin}${item.path}`
  const shell = await loadShell(req.payload, req.user)
  const { role, counts } = shell
  const count = (item: NavItem) => (item.counter ? (counts[item.counter] ?? 0) : 0)
  const current = (item: NavItem) => (item.key === active ? ('page' as const) : undefined)
  const status = statusText(shell)
  const bellHref = `${admin}/zapytania?filtr=nowe`

  const tiles: MoreTile[] = navMore(role).map((item) => ({
    key: item.key,
    label: item.short ?? item.label,
    href: href(item),
    icon: item.icon,
    count: count(item),
    current: item.key === active,
  }))
  // Tabs and tiles share keys with the sidebar: "Więcej" is current when the screen is in it.
  const moreCurrent = tiles.some((t) => t.current)

  return (
    <div className="pn" data-panel>
      <a className="pn-skip" href="#pn-tresc">
        Przejdź do treści
      </a>

      <aside className="pn-side">
        <a className="pn-brand" href={admin}>
          <Brand />
          <span className="pn-brand__tag">Panel</span>
          {/* Visible text first in the name (WCAG 2.5.3), like the site logo. */}
          <span className="pn-sr">, pulpit</span>
        </a>
        {navGroups(role).map((group) => (
          <nav key={group.label} className="pn-navg" aria-label={group.label}>
            <h2>{group.label}</h2>
            {group.items.map((item) => (
              <a key={item.key} className="pn-ni" href={href(item)} aria-current={current(item)}>
                <Icon name={item.icon} />
                <span>{item.label}</span>
                <Badge value={count(item)} tone={item.tone} />
              </a>
            ))}
          </nav>
        ))}
        <div className="pn-side__foot">
          <div className="pn-who">
            <span className="pn-av" aria-hidden="true">
              {shell.initials}
            </span>
            <span>
              {shell.name}
              <small>{roleLabel(role)}</small>
            </span>
          </div>
          <a className="pn-btn pn-btn--sm" href={`${admin}/logout`}>
            Wyloguj
          </a>
        </div>
      </aside>

      <div className="pn-main">
        {/* Phone: app bar. The title shows only after the big one scrolls away (spec §2a pt 2). */}
        <header className="pn-mtop">
          {back ? (
            <a className="pn-mtop__back" href={back.href} aria-label={back.label}>
              <Icon name="back" size={22} />
            </a>
          ) : null}
          {active === 'dashboard' && !back ? (
            <a className="pn-brand" href={admin}>
              <Brand />
              <span className="pn-sr">, pulpit</span>
            </a>
          ) : (
            <span className="pn-mtop__title" aria-hidden="true">
              {title}
            </span>
          )}
          {role === 'admin' ? <Bell href={bellHref} count={shell.bell} /> : null}
        </header>

        {/* Computer: top bar. Search (P8) and "Sprawdź ceny" (P7) come with their sessions. */}
        <header className="pn-top">
          <nav aria-label="Okruszki">
            <ol className="pn-crumb">
              <li>
                <a href={admin}>Panel</a>
              </li>
              {crumbs.map((c) => (
                <li key={c.label}>{c.href ? <a href={c.href}>{c.label}</a> : c.label}</li>
              ))}
              <li>
                <span aria-current="page">{title}</span>
              </li>
            </ol>
          </nav>
          <span className="pn-sp" />
          {status ? (
            <span className="pn-live">
              <span className={shell.marginAlarm ? 'pn-dot pn-dot--bad' : 'pn-dot'} />
              {status}
            </span>
          ) : null}
          {role === 'admin' ? <Bell href={bellHref} count={shell.bell} /> : null}
        </header>

        <main className="pn-wrap" id="pn-tresc" tabIndex={-1}>
          {children}
        </main>
      </div>

      <nav className="pn-tabbar-nav" aria-label="Panel, nawigacja dolna">
        <ul className="pn-tabbar" style={{ ['--tabs' as string]: navTabs(role).length + 1 }}>
          {navTabs(role).map((item) => (
            <li key={item.key}>
              <a className="pn-tab" href={href(item)} aria-current={current(item)}>
                <span className="pn-tab__ic">
                  <Icon name={item.icon} size={21} />
                </span>
                {item.short ?? item.label}
                <TabBadge value={count(item)} tone={item.tone} />
              </a>
            </li>
          ))}
          <li>
            <MoreSheet
              tiles={tiles}
              current={moreCurrent}
              status={status}
              marginAlarm={shell.marginAlarm}
              queue={role === 'admin' ? (counts.queue ?? 0) : 0}
              who={{ name: shell.name, initials: shell.initials, role: roleLabel(role) }}
              logoutHref={`${admin}/logout`}
            />
          </li>
        </ul>
      </nav>
      <ScrollWatch />
    </div>
  )
}

function statusText(shell: ShellData): string | null {
  if (shell.role !== 'admin') return null
  if (shell.marginAlarm) return 'Marża poniżej minimum · sprawdź ceny'
  return shell.batchDate ? `Strona działa · ceny z ${shell.batchDate}` : 'Strona działa'
}

export function Brand() {
  return (
    <span>
      <b>
        PRO<i>–</i>KOM
      </b>
      <small>GAMING</small>
    </span>
  )
}

function Badge({ value, tone = 'mu' }: { value: number; tone?: NavItem['tone'] }) {
  if (value <= 0) return null
  const cls = tone === 'bad' ? 'pn-bd pn-bd--bad' : tone === 'gold' ? 'pn-bd pn-bd--gold' : 'pn-bd'
  return <span className={cls}>{shortCount(value)}</span>
}

function TabBadge({ value, tone }: { value: number; tone?: NavItem['tone'] }) {
  if (value <= 0) return null
  return <em className={tone === 'bad' ? 'pn-bd--bad' : undefined}>{shortCount(value)}</em>
}

function Bell({ href, count }: { href: string; count: number }) {
  const label = count > 0 ? `Powiadomienia, ${shortCount(count)} nowe` : 'Powiadomienia'
  return (
    <a className="pn-icb" href={href} aria-label={label}>
      <Icon name="bell" size={20} />
      {count > 0 ? <em aria-hidden="true">{shortCount(count)}</em> : null}
    </a>
  )
}
