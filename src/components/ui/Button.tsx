import Link from 'next/link'
import type { ComponentProps, ReactNode } from 'react'

type Variant = 'gold' | 'ghost'
type Size = 'md' | 'lg'

type Common = { variant?: Variant; size?: Size; className?: string; children: ReactNode }

function classes({ variant = 'gold', size = 'md', className }: Omit<Common, 'children'>) {
  return ['btn', variant === 'ghost' && 'btn--ghost', size === 'lg' && 'btn--lg', className]
    .filter(Boolean)
    .join(' ')
}

/** Gold (action, ADR-G003 §1) or ghost pill button rendered as a link. */
export function ButtonLink({
  variant,
  size,
  className,
  children,
  ...rest
}: Common & Omit<ComponentProps<typeof Link>, 'className'>) {
  return (
    <Link className={classes({ variant, size, className })} {...rest}>
      {children}
    </Link>
  )
}

/** The same look as a `<button>` (actions that do not navigate). */
export function Button({
  variant,
  size,
  className,
  children,
  type = 'button',
  ...rest
}: Common & Omit<ComponentProps<'button'>, 'className'>) {
  return (
    <button type={type} className={classes({ variant, size, className })} {...rest}>
      {children}
    </button>
  )
}
