import type { UserRole } from '../../access/panel'
import type { IconName } from '../ui/icons'

/**
 * Panel navigation (panel spec §2 "Nawigacja", §2a pt 3–4): one list for the sidebar, the bottom
 * tabs, the "Więcej" sheet and the links above Payload's own lists. Pure data — no Payload.
 */

export type NavKey =
  | 'dashboard'
  | 'inquiries'
  | 'orders'
  | 'clients'
  | 'pricesCentre'
  | 'reports'
  | 'approve'
  | 'builds'
  | 'options'
  | 'stock'
  | 'vouchers'
  | 'stats'
  | 'settings'
  | 'tickets'
  | 'units'
  | 'data'

export type CounterKey = 'inquiriesNew' | 'ordersActive' | 'queue'
export type BadgeTone = 'bad' | 'gold' | 'mu'

export type NavItem = {
  key: NavKey
  label: string
  /** Shorter name on a "Więcej" tile or a tab. */
  short?: string
  icon: IconName
  /** Path under the admin route ('' = /admin). */
  path: string
  roles: readonly UserRole[]
  counter?: CounterKey
  tone?: BadgeTone
  /**
   * False until the session that builds the screen (spec §2a pt 3: hidden, not a dead link).
   * Items with a temporary target point at the Payload list or the G4 screen meanwhile.
   */
  ready: boolean
}

const ADMIN = ['admin'] as const
const STAFF = ['admin', 'serwis'] as const

const ITEMS: Record<NavKey, NavItem> = {
  dashboard: {
    key: 'dashboard',
    label: 'Pulpit',
    icon: 'home',
    path: '',
    roles: ADMIN,
    ready: true,
  },
  // TODO(P3): `/zapytania` — until then the Payload list of inquiries.
  inquiries: {
    key: 'inquiries',
    label: 'Zapytania',
    icon: 'mail',
    path: '/collections/inquiries',
    roles: ADMIN,
    counter: 'inquiriesNew',
    tone: 'bad',
    ready: true,
  },
  // TODO(P5): `/zamowienia` (workshop board) — until then the Payload list of orders.
  orders: {
    key: 'orders',
    label: 'Zamówienia',
    icon: 'box',
    path: '/collections/orders',
    roles: ADMIN,
    counter: 'ordersActive',
    tone: 'mu',
    ready: true,
  },
  clients: {
    key: 'clients',
    label: 'Klienci',
    icon: 'user',
    path: '/klienci',
    roles: ADMIN,
    ready: false,
  },
  pricesCentre: {
    key: 'pricesCentre',
    label: 'Centrum cen',
    icon: 'tag',
    path: '/ceny',
    roles: ADMIN,
    ready: false, // P6: the prices centre; the G4 screen sits under "Do zatwierdzenia" until then
  },
  reports: {
    key: 'reports',
    label: 'Raporty cen',
    icon: 'report',
    path: '/raporty-cen',
    roles: ADMIN,
    tone: 'gold',
    ready: false,
  },
  // TODO(P6): `/ceny/zatwierdzanie` — until then the G4 prices screen (queue + guard).
  approve: {
    key: 'approve',
    label: 'Do zatwierdzenia',
    short: 'Zatwierdź',
    icon: 'check',
    path: '/ceny',
    roles: ADMIN,
    counter: 'queue',
    tone: 'gold',
    ready: true,
  },
  // TODO(P6): `/zestawy` — until then the Payload list of builds.
  builds: {
    key: 'builds',
    label: 'Gotowe zestawy',
    short: 'Zestawy',
    icon: 'tower',
    path: '/collections/builds',
    roles: ADMIN,
    ready: true,
  },
  options: {
    key: 'options',
    label: 'Opcje konfiguratora',
    short: 'Opcje',
    icon: 'layers',
    path: '/opcje',
    roles: ADMIN,
    ready: false,
  },
  // Payload lists in v1, no own screen (spec §1, P0).
  stock: {
    key: 'stock',
    label: 'Gotowe od ręki',
    icon: 'box',
    path: '/collections/stock',
    roles: ADMIN,
    ready: true,
  },
  vouchers: {
    key: 'vouchers',
    label: 'Bony',
    icon: 'ticket',
    path: '/collections/vouchers',
    roles: ADMIN,
    ready: true,
  },
  stats: {
    key: 'stats',
    label: 'Statystyki strony',
    short: 'Statystyki',
    icon: 'chart',
    path: '/statystyki',
    roles: ADMIN,
    ready: false,
  },
  settings: {
    key: 'settings',
    label: 'Ustawienia',
    icon: 'gear',
    path: '/ustawienia',
    roles: ADMIN,
    ready: true,
  },
  // The workshop of the `serwis` role (spec §2a pt 3); own screens in P5.
  tickets: {
    key: 'tickets',
    label: 'Zgłoszenia',
    icon: 'inbox',
    path: '/collections/tickets',
    roles: STAFF,
    ready: true,
  },
  units: {
    key: 'units',
    label: 'Egzemplarze',
    icon: 'tower',
    path: '/collections/units',
    roles: STAFF,
    ready: true,
  },
  data: {
    key: 'data',
    label: 'Dane (listy)',
    icon: 'archive',
    path: '/dane',
    roles: STAFF,
    ready: true,
  },
}

/** Sidebar groups on a computer (spec §2), in order. */
const GROUPS: { label: string; keys: NavKey[] }[] = [
  { label: 'Codziennie', keys: ['dashboard', 'inquiries', 'orders', 'clients'] },
  { label: 'Ceny', keys: ['pricesCentre', 'reports', 'approve'] },
  { label: 'Oferta', keys: ['builds', 'options', 'stock', 'vouchers'] },
  { label: 'Analiza', keys: ['stats'] },
  { label: 'System', keys: ['settings', 'data'] },
]

/** The workshop of the `serwis` role: orders are its board (spec §2a pt 3). */
const SERWIS_GROUPS: { label: string; keys: NavKey[] }[] = [
  { label: 'Warsztat', keys: ['orders', 'tickets', 'units'] },
  { label: 'System', keys: ['data'] },
]

const TABS: Record<UserRole, NavKey[]> = {
  admin: ['dashboard', 'inquiries', 'approve', 'builds'],
  serwis: ['orders', 'tickets', 'units'],
}

const MORE: Record<UserRole, NavKey[]> = {
  admin: ['orders', 'clients', 'pricesCentre', 'reports', 'options', 'stats', 'settings', 'data'],
  serwis: ['data'],
}

/** The serwis role reads orders as its workshop (spec §2a pt 3, labels of the tabs). */
const SERWIS_LABELS: Partial<Record<NavKey, Partial<NavItem>>> = {
  orders: { label: 'Warsztat', icon: 'wrench', roles: STAFF, counter: 'ordersActive', tone: 'mu' },
}

function itemFor(key: NavKey, role: UserRole): NavItem {
  const base = ITEMS[key]
  return role === 'serwis' ? { ...base, ...SERWIS_LABELS[key] } : base
}

const visible = (role: UserRole) => (item: NavItem) => item.ready && item.roles.includes(role)

export function navGroups(role: UserRole): { label: string; items: NavItem[] }[] {
  return (role === 'serwis' ? SERWIS_GROUPS : GROUPS)
    .map((g) => ({
      label: g.label,
      items: g.keys.map((k) => itemFor(k, role)).filter(visible(role)),
    }))
    .filter((g) => g.items.length > 0)
}

/** Bottom tabs before "Więcej" (spec §2a pt 3). */
export function navTabs(role: UserRole): NavItem[] {
  return TABS[role].map((k) => itemFor(k, role)).filter(visible(role))
}

/** Tiles in the "Więcej" sheet (spec §2a pt 4); "Strona" is added by the sheet itself. */
export function navMore(role: UserRole): NavItem[] {
  return MORE[role].map((k) => itemFor(k, role)).filter(visible(role))
}

export function navItem(key: NavKey, role: UserRole): NavItem {
  return itemFor(key, role)
}
