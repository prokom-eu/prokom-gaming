'use client'

import Link from 'next/link'
import type { CSSProperties, ReactNode } from 'react'

import type { Features } from '@/lib/features'
import { buildHref, routes } from '@/lib/nav'
import type { MenuCreature } from '@/lib/site'

import { BottomSheet } from './BottomSheet'
import { HScroll } from './HScroll'
import {
  IconArrow,
  IconBars,
  IconBook,
  IconBox,
  IconGift,
  IconPhone,
  IconQr,
  IconQuestion,
  IconShield,
  IconUser,
} from './icons'
import { Logo } from './Logo'
import { useShell } from './shell/ShellProvider'
import { Sigil } from './Sigil'
import { ButtonLink } from './ui/Button'

type Props = {
  creatures: MenuCreature[]
  phone: { label: string; href: string }
  features: Features
}

type Tile = { href: string; icon: ReactNode; title: string; note: string }

/**
 * The "Menu" tab (ADR-G003 §4, stany/tel-02-menu.jpg): a bottom sheet on the phone, a panel
 * from the right on a tablet. 16 creatures, 8 tiles, 4 links and the contact card.
 */
export function MenuSheet({ creatures, phone, features }: Props) {
  const { menuOpen, closeMenu, compareCount } = useShell()

  const allTiles: Tile[] = [
    {
      href: routes.stock,
      icon: <IconBox />,
      title: 'Gotowe od ręki',
      note: 'złożone i sprawdzone',
    },
    {
      href: routes.compare,
      icon: <IconBars />,
      title: 'Porównywarka',
      note: `${compareCount} w porównaniu`,
    },
    { href: routes.guides, icon: <IconBook />, title: 'Poradniki', note: 'jak wybrać' },
    { href: routes.parents, icon: <IconShield />, title: 'Dla rodziców', note: 'bez żargonu' },
    {
      href: routes.certificate,
      icon: <IconQr />,
      title: 'Metryka komputera',
      note: 'kod z naklejki',
    },
    { href: routes.account, icon: <IconUser />, title: 'Moje konto', note: 'status i gwarancja' },
    { href: routes.voucher, icon: <IconGift />, title: 'Bon podarunkowy', note: 'na prezent' },
    { href: routes.faq, icon: <IconQuestion />, title: 'Częste pytania', note: 'zakup i dostawa' },
  ]
  // Gotowe od ręki and the voucher only when their page is on (lib/features.ts).
  const tiles = allTiles.filter(
    (t) =>
      (features.ready || t.href !== routes.stock) &&
      (features.voucher || t.href !== routes.voucher),
  )

  return (
    <BottomSheet
      id="menu"
      open={menuOpen}
      onClose={closeMenu}
      label="Menu"
      closeLabel="Zamknij menu"
      headerStart={<Logo small />}
      side
    >
      {/* Any link closes the sheet — also one to the page already open, where the pathname
          does not change (ShellProvider closes the menu only on a new pathname). */}
      <div
        onClickCapture={(event) => {
          if (event.target instanceof Element && event.target.closest('a')) closeMenu()
        }}
      >
        <section aria-labelledby="menu-builds">
          <div className="menu__sec">
            <h2 id="menu-builds">Zestawy</h2>
            <Link href={routes.builds}>
              Wszystkie {creatures.length} <IconArrow />
            </Link>
          </div>
          <HScroll as="ul" className="menu__creatures">
            {creatures.map((c) => (
              <li key={c.slug}>
                <Link
                  className="menu__creature"
                  href={buildHref(c.slug)}
                  style={{ '--c': `var(--c-${c.slug})` } as CSSProperties}
                >
                  <Sigil id={c.id} ring={false} size={40} style={{ color: 'var(--c)' }} />
                  <b className="nm">{c.name}</b>
                  {/* TODO(krystian): G4 — price "from" of the build from published-prices. */}
                </Link>
              </li>
            ))}
          </HScroll>
        </section>

        <ul className="menu__tiles">
          {tiles.map((t) => (
            <li key={t.href}>
              <Link className="menu__tile" href={t.href}>
                {t.icon}
                <b>{t.title}</b>
                <small>{t.note}</small>
              </Link>
            </li>
          ))}
        </ul>

        <ul className="menu__links">
          <li>
            <Link href={routes.about}>O nas</Link>
          </li>
          <li>
            <Link href={routes.contact}>Kontakt i dojazd</Link>
          </li>
          <li>
            <Link href={routes.terms}>Regulamin i zwroty</Link>
          </li>
          <li>
            <Link href={routes.privacy}>Prywatność i cookies</Link>
          </li>
        </ul>

        <div className="menu__contact">
          <div>
            <b>Odpowiadamy codziennie 8–22</b>
            <small>Zwykle w godzinę. Salony: Rabka-Zdrój i Zakopane.</small>
          </div>
          <div className="menu__contact-actions">
            <a className="btn btn--ghost" href={phone.href} aria-label={`Zadzwoń: ${phone.label}`}>
              <IconPhone />
              Zadzwoń
            </a>
            <ButtonLink href={routes.inquiry}>Napisz</ButtonLink>
          </div>
        </div>
      </div>
    </BottomSheet>
  )
}
