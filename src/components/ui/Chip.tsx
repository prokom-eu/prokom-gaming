import type { ComponentProps } from 'react'

/** Toggle pill (filters). `pressed` = selected, exposed as `aria-pressed`. */
export function Chip({
  pressed,
  className,
  type = 'button',
  ...rest
}: { pressed: boolean } & Omit<ComponentProps<'button'>, 'aria-pressed'>) {
  return (
    <button
      type={type}
      aria-pressed={pressed}
      className={className ? `chip ${className}` : 'chip'}
      {...rest}
    />
  )
}
