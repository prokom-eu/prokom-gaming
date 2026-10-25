import type { ComponentProps, ElementType, ReactNode } from 'react'

type Props<T extends ElementType> = {
  as?: T
  children: ReactNode
  className?: string
} & Omit<ComponentProps<T>, 'as' | 'children' | 'className'>

/**
 * Horizontal row with scroll-snap and no visible scrollbar (ADR-G003 §4): the next card peeks
 * in from the right. Pure CSS; children are the cards. Use `as="ul"` for lists of links.
 */
export function HScroll<T extends ElementType = 'div'>({
  as,
  children,
  className,
  ...rest
}: Props<T>) {
  const Tag: ElementType = as ?? 'div'
  return (
    <Tag className={className ? `hscroll ${className}` : 'hscroll'} {...rest}>
      {children}
    </Tag>
  )
}
