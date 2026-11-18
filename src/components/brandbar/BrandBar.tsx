import Link from 'next/link'
import type { CSSProperties } from 'react'

import { CURRENT_LINE, LINES } from '@/lib/lines'
import { company } from '@/lib/site'

import { BrandBarPill } from './BrandBarPill'
import './brandbar.css'

/**
 * Before hydration: marks the bar as already seen in this tab (the lines come in one after another
 * once a session), and puts the header where SiteHeader will (`--bbar-scroll`), so a reload in
 * the middle of the page does not make it jump.
 */
const BOOT_SCRIPT = `try{document.documentElement.style.setProperty('--bbar-scroll',Math.min(Math.max(scrollY,0),38)+'px');var b=document.currentScript.previousElementSibling;if(sessionStorage.getItem('pkg:bbar'))b.setAttribute('data-seen','');else sessionStorage.setItem('pkg:bbar','1')}catch(e){}`

/**
 * PRO-KOM brand bar above the header (MOTYW-PASEK-LINII §4–§5, runda 18.11): the lines of every
 * PRO-KOM site on the left, Gaming last and current; the response hours and the phone on the
 * right, as in the header. 38 px, scrolls away with the page; from 1081 px only — below that the
 * lines are chips in the menu sheet. A Server Component; the pill is its only island.
 */
export function BrandBar({ hours }: { hours: string }) {
  return (
    <>
      <div className="bbar" data-brand-bar="" suppressHydrationWarning>
        <nav aria-label="Linie PRO-KOM" className="bbar__lines">
          <BrandBarPill />
          {LINES.map((line, index) => {
            const isCurrent = line.key === CURRENT_LINE
            const tip = `bbar-tip-${line.key}`
            const props = {
              className: 'bbar__line',
              'aria-current': isCurrent ? ('page' as const) : undefined,
              'aria-describedby': tip,
            }
            return (
              <span
                key={line.key}
                className="bbar__item"
                data-first={index === 0 ? '' : undefined}
                style={{ '--lc': line.color, '--i': index } as CSSProperties}
              >
                {isCurrent ? (
                  <Link href={line.href} {...props}>
                    <i aria-hidden="true" className="bbar__dash" />
                    {line.name}
                  </Link>
                ) : (
                  <a href={line.href} {...props}>
                    <i aria-hidden="true" className="bbar__dash" />
                    {line.name}
                  </a>
                )}
                <span role="tooltip" id={tip} className="bbar__tip">
                  {line.description}
                </span>
              </span>
            )
          })}
        </nav>
        <section aria-label="Godziny i kontakt" className="bbar__right">
          <span>Odpowiadamy {hours}</span>
          <a href={company.phoneHref} className="bbar__phone">
            <b>{company.phone}</b>
          </a>
        </section>
      </div>
      <script dangerouslySetInnerHTML={{ __html: BOOT_SCRIPT }} />
    </>
  )
}
