import Link from 'next/link'

import type { Features } from '@/lib/features'
import { routes } from '@/lib/nav'
import { company, social } from '@/lib/site'

import { Logo } from './Logo'
import { Container } from './ui/Container'

const allColumns = [
  {
    title: 'Komputery',
    links: [
      { href: routes.builds, label: 'Wszystkie zestawy' },
      { href: routes.stock, label: 'Gotowe od ręki' },
      { href: routes.configurator, label: 'Konfigurator' },
      { href: routes.gamePicker, label: 'Dobór pod grę' },
      { href: routes.compare, label: 'Porównywarka' },
      { href: routes.inquiry, label: 'Zapytanie o komputer' },
    ],
  },
  {
    title: 'Po zakupie',
    links: [
      { href: routes.certificate, label: 'Metryka komputera' },
      { href: routes.account, label: 'Moje konto' },
      // TODO(krystian): G14 — a direct address of the ticket form inside the account.
      { href: routes.account, label: 'Zgłoś problem' },
      { href: routes.terms, label: 'Gwarancja i zwroty' },
      { href: routes.voucher, label: 'Bon podarunkowy' },
    ],
  },
  {
    title: 'PRO-KOM',
    links: [
      { href: routes.about, label: 'O nas' },
      { href: routes.contact, label: 'Kontakt i dojazd' },
      { href: routes.parents, label: 'Dla rodziców' },
      { href: routes.faq, label: 'Częste pytania' },
      { href: routes.guides, label: 'Poradniki' },
    ],
  },
]

/** Footer (spec. §3): 5 columns + legal bar; on a phone 2 columns, first and last full width. */
export function SiteFooter({ features }: { features: Features }) {
  // Gotowe od ręki and the voucher only when their page is on (lib/features.ts).
  const hidden = new Set<string>([
    ...(features.ready ? [] : [routes.stock]),
    ...(features.voucher ? [] : [routes.voucher]),
  ])
  const columns = allColumns.map((col) => ({
    ...col,
    links: col.links.filter((link) => !hidden.has(link.href)),
  }))
  return (
    <footer className="foot">
      <Container className="foot__grid">
        <div>
          <Logo />
          <p>
            Komputery do gier składane ręcznie w Rabce-Zdroju. Każdy z pomiarem klatek i metryką.
          </p>
          <p className="foot__tight">
            <Link className="foot__cta" href={routes.inquiry}>
              Odpowiadamy codziennie 8–22
            </Link>
          </p>
        </div>
        {columns.map((col) => (
          <nav key={col.title} aria-label={col.title}>
            <h2>{col.title}</h2>
            <ul className="foot__links">
              {col.links.map((l) => (
                <li key={l.label}>
                  <Link href={l.href}>{l.label}</Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
        <div>
          <h2>Kontakt</h2>
          <address className="not-italic">
            <p className="foot__tight">
              {company.name}
              <br />
              {company.address}
              <br />
              NIP {company.nip}
            </p>
            <ul className="foot__links">
              <li>
                <a href={`mailto:${company.email}`}>{company.email}</a>
              </li>
              <li>
                <a href={company.phoneHref}>{company.phone}</a>
              </li>
            </ul>
          </address>
        </div>
      </Container>
      <Container className="foot__bar">
        <span>© 2026 PRO-KOM. Komputery składane w Rabce-Zdroju od 2004 roku.</span>
        <ul>
          {social
            .filter((s) => s.href)
            .map((s) => (
              <li key={s.label}>
                <a href={s.href} rel="noopener">
                  {s.label}
                </a>
              </li>
            ))}
          <li>
            <Link href={routes.terms}>Regulamin</Link>
          </li>
          <li>
            <Link href={routes.privacy}>Polityka prywatności</Link>
          </li>
          <li>
            {/* TODO(krystian): G13 — the cookie settings panel (spec. §21); anchor agreed then. */}
            <Link href={`${routes.privacy}#cookies`}>Ustawienia cookies</Link>
          </li>
        </ul>
        {/* Seller and the parent company, required in an online shop's footer anyway. */}
        <p className="foot__brand">
          PRO-KOM Gaming to marka {company.name} · NIP {company.nip} · {company.address} ·{' '}
          <a href={company.parentSite.href}>{company.parentSite.label}</a>
        </p>
      </Container>
    </footer>
  )
}
