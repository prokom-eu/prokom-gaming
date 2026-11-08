import type { CSSProperties } from 'react'

/**
 * A number that counts up when its block enters the view and rolls to a new value when it
 * changes (runda v3 PREMIUM §2.3: frame counts, comparison). CSS only: the visible digits are a
 * CSS counter driven by a registered integer (`--n`, globals.css), so no script runs per frame.
 * The real number stays in the DOM (read by screen readers, copied, checked by tests); the
 * counter is in an aria-hidden span. Reduced motion: the end value at once.
 *
 * Counts from zero while an ancestor waits for its entry (`[data-reveal="wait"]`,
 * `[data-shown="false"]`); the width is reserved for the final digits, so nothing shifts.
 */
export function Count({ value }: { value: number }) {
  return (
    <span
      className="count"
      style={{ '--to': value, '--digits': String(value).length } as CSSProperties}
    >
      <span className="count__d" aria-hidden="true" />
      <span className="count__v">{value}</span>
    </span>
  )
}

/** A text that starts with a number („142 FPS”, „240 FPS, limit gry”): only the number counts. */
export function CountText({ text }: { text: string }) {
  const match = /^(\d+)(.*)$/s.exec(text)
  if (!match?.[1]) return text
  return (
    <>
      <Count value={Number(match[1])} />
      {match[2]}
    </>
  )
}
