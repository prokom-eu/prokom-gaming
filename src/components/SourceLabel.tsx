import { sourceOf, type FpsKind } from '@/lib/fps'

/**
 * Where an FPS number comes from: dot + label, colour by group (ADR-G004 §2, ADR-G003 §2).
 * Shown next to every number on the site — never a number without it.
 */
export function SourceLabel({ kind }: { kind: FpsKind }) {
  const { label, tone } = sourceOf(kind)
  return (
    <span className={`src src--${tone}`}>
      <i aria-hidden="true" />
      {label}
    </span>
  )
}
