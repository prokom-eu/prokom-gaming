// Site addresses used by the shell (spec. §2). Pages arrive in later sessions; until then the
// links lead to the 404 page.
export const routes = {
  home: '/',
  builds: '/zestawy',
  configurator: '/konfigurator',
  gamePicker: '/dobor-pod-gre',
  compare: '/porownaj',
  inquiry: '/zapytanie',
  stock: '/gotowe',
  voucher: '/bon',
  certificate: '/metryka',
  account: '/konto',
  parents: '/dla-rodzicow',
  about: '/o-nas',
  contact: '/kontakt',
  faq: '/pytania',
  guides: '/poradniki',
  terms: '/regulamin',
  privacy: '/polityka-prywatnosci',
} as const

export const buildHref = (slug: string) => `${routes.builds}/${slug}`

// Desktop header (spec. §3).
export const headerLinks = [
  { href: routes.builds, label: 'Zestawy' },
  { href: routes.configurator, label: 'Konfigurator' },
  { href: routes.gamePicker, label: 'Dobór pod grę' },
  { href: routes.compare, label: 'Porównaj' },
  { href: routes.parents, label: 'Dla rodziców' },
  { href: routes.about, label: 'O nas' },
  { href: routes.contact, label: 'Kontakt' },
] as const

/** True when `pathname` is `href` or a page below it (`/zestawy/wampir` → Zestawy). */
export function isCurrent(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(`${href}/`)
}
