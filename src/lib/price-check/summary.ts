/**
 * The model describes, never computes (ADR-G007 §2 pt 6): every number in Claude's summary must
 * be one of the numbers of the `diff` computed by lib/pricing. Numbers are normalized (spaces,
 * comma/dot, „%”, „zł”, minus signs); small counts up to 10 („2 zestawy”) are allowed.
 */

const NUMBER = /[-−–]?\d[\d\s  ]*(?:[.,]\d+)?/g

/** Numbers as written in a Polish text: „2 219 zł” → 2219, „−4,3%” → -4.3. */
export function numbersIn(text: string): number[] {
  const out: number[] = []
  for (const match of text.matchAll(NUMBER)) {
    const raw = match[0]
      .replace(/[\s  ]/g, '')
      .replace(/[−–]/, '-')
      .replace(',', '.')
    const value = Number(raw)
    if (Number.isFinite(value)) out.push(value)
  }
  return out
}

/** Every way a number of the diff may be shown: as is, rounded, and shares as percents. */
export function allowedNumbers(values: readonly number[]): Set<string> {
  const set = new Set<string>()
  const add = (v: number) => {
    for (const d of [0, 1, 2]) {
      const r = Number(v.toFixed(d))
      set.add(String(Math.abs(r)))
    }
    // Rounded down to one decimal, like the panel's short margins (`percentShort`).
    set.add(String(Math.abs(Math.floor(v * 10 + 1e-9) / 10)))
  }
  for (const v of values) {
    if (!Number.isFinite(v)) continue
    add(v)
    if (Math.abs(v) < 5) add(v * 100)
  }
  return set
}

/** Numbers of the summary that are not in the diff (empty = the summary may be shown). */
export function unknownNumbers(summary: string, diffValues: readonly number[]): number[] {
  const allowed = allowedNumbers(diffValues)
  return numbersIn(summary).filter((n) => {
    const abs = Math.abs(n)
    if (Number.isInteger(abs) && abs <= 10) return false
    return !allowed.has(String(abs))
  })
}

/** Every number anywhere in a JSON value (the diff), for `unknownNumbers`. */
export function numbersOf(value: unknown, out: number[] = []): number[] {
  if (typeof value === 'number') out.push(value)
  else if (Array.isArray(value)) for (const v of value) numbersOf(v, out)
  else if (value && typeof value === 'object')
    for (const v of Object.values(value)) numbersOf(v, out)
  return out
}
