import Link from 'next/link'

/** Link to the prices screen at the end of the panel navigation (custom views have no nav entry). */
export function PricesNavLink() {
  return (
    <Link href="/admin/ceny" className="nav__link" prefetch={false}>
      <span className="nav__link-label">Ceny — publikacja i marże</span>
    </Link>
  )
}
