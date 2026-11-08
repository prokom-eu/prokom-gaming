import type { CSSProperties } from 'react'

/**
 * A creature's name split into letters on the server (runda v3 PREMIUM §2.3: letters rise one by
 * one, 40 ms apart, then one sheen runs over them). Each letter is an inline block with `--ch`
 * = its position, so CSS alone runs the cascade from the first paint, before any JavaScript.
 * Spaces stay plain text so the name keeps its word gap.
 *
 * The letters are decorative: pass `label` where the name must be read (a heading) — the whole
 * name goes to screen readers once, the letters are hidden from them.
 */
export function Letters({ text, label = false }: { text: string; label?: boolean }) {
  const letters = [...text].map((ch, i) =>
    ch === ' ' ? (
      ' '
    ) : (
      <span key={i} className="ch" style={{ '--ch': i } as CSSProperties}>
        {ch}
      </span>
    ),
  )
  if (!label) return <>{letters}</>
  return (
    <>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">{letters}</span>
    </>
  )
}
