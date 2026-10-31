import type { ReactNode } from 'react'

/**
 * Filter as a pill with a count. A link when the filter lives in the address (never personal
 * data there — spec §1), else a toggle button.
 */
export function FilterPill({
  label,
  count,
  active,
  href,
  onClick,
}: {
  label: string
  count?: number
  active: boolean
  href?: string
  onClick?: () => void
}) {
  const body: ReactNode = (
    <>
      {label}
      {count !== undefined ? <b>{count}</b> : null}
    </>
  )
  if (href) {
    return (
      <a className="pn-fpill" href={href} aria-current={active ? 'true' : undefined}>
        {body}
      </a>
    )
  }
  return (
    <button type="button" className="pn-fpill" aria-pressed={active} onClick={onClick}>
      {body}
    </button>
  )
}
