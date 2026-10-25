import Link from 'next/link'

import { routes } from '@/lib/nav'

// PRO–KOM GAMING mark (Archivo 118/800). Text, not an image: sharp at any size and no request.
export function Logo({ small = false }: { small?: boolean }) {
  return (
    <Link href={routes.home} className={small ? 'logo logo--sm' : 'logo'}>
      <b>
        PRO<i>–</i>KOM
      </b>
      <span className="logo__sub">GAMING</span>
      {/* The accessible name keeps the visible text first (WCAG 2.5.3 Label in Name). */}
      <span className="sr-only">, strona główna</span>
    </Link>
  )
}
