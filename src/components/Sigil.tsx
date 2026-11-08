import type { CSSProperties } from 'react'

type Props = {
  /** Creature key of the file in /public/sigils (e.g. `licho`, `baba`). */
  id: string
  /** With the outer ring (default) or the plain mark. */
  ring?: boolean
  size?: number
  /** Accessible name; without it the sigil is decorative. */
  label?: string
  className?: string
  style?: CSSProperties
}

/**
 * Creature sigil (ADR-G003 §3). Drawn as a CSS mask filled with `currentColor`, so the colour
 * comes from the parent (`color: var(--c-licho)`), without JS or inline SVG markup.
 * A glow (`filter: drop-shadow`) must sit on a parent element — the mask would clip it here.
 */
export function Sigil({ id, ring = true, size = 40, label, className, style }: Props) {
  const file = `/sigils/${id}${ring ? '' : '-plain'}.svg`
  return (
    <span
      className={className ? `sigil ${className}` : 'sigil'}
      style={{ width: size, height: size, ['--sigil' as string]: `url(${file})`, ...style }}
      {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}
    />
  )
}
