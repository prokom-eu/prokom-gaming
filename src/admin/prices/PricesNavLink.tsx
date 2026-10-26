import Link from 'next/link'
import type { ServerProps } from 'payload'

/**
 * Link to the prices screen at the end of the panel navigation (custom views have no nav entry).
 * The admin route comes from the config, like in the screen itself.
 */
export function PricesNavLink({ payload }: Partial<ServerProps>) {
  const admin = payload?.config.routes.admin ?? '/admin'
  return (
    <Link href={`${admin}/ceny`} className="nav__link" prefetch={false}>
      <span className="nav__link-label">Ceny — publikacja i marże</span>
    </Link>
  )
}
