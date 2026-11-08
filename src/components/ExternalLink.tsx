import type { ReactNode } from 'react'

import { registers } from '@/lib/site'

/**
 * A link that opens another site in a new tab, saying so to screen readers (WCAG 3.2.5) — the
 * register and maps links of the home page, „Dla rodziców” and „Kontakt”.
 */
export function ExternalLink({
  href,
  className,
  children,
}: {
  href: string
  className?: string
  children: ReactNode
}) {
  return (
    <a className={className} href={href} target="_blank" rel="noopener noreferrer">
      {children}
      <span className="sr-only"> (otwiera się w nowej karcie)</span>
    </a>
  )
}

/** „Sprawdź w CEIDG” and „Sprawdź na białej liście VAT”: where a parent checks the company. */
export function RegisterLinks({ className = 'lnk' }: { className?: string }) {
  return (
    <>
      <ExternalLink href={registers.ceidg} className={className}>
        Sprawdź w CEIDG
      </ExternalLink>
      <ExternalLink href={registers.vatList} className={className}>
        Sprawdź na białej liście VAT
      </ExternalLink>
    </>
  )
}
