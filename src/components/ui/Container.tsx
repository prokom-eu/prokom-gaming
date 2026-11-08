import type { ComponentProps } from 'react'

/** Page width 1440 with the board gutters: 80 px desktop, 22 px up to 1000 px (tokens). */
export function Container({ className, ...rest }: ComponentProps<'div'>) {
  return <div className={className ? `wrap ${className}` : 'wrap'} {...rest} />
}
