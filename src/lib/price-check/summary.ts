import type { CheckDiff } from './diff'

/**
 * The model describes, never computes (ADR-G007 §2 pt 6): every number in Claude's summary must
 * be one of the numbers given to it, computed by lib/pricing. Numbers are normalized (spaces,
 * comma/dot, „%”, „zł”, minus signs); small counts up to 10 („2 zestawy”) are allowed. Names of
 * items and builds („Ryzen 7 9800X3D”, „RTX 5080 16 GB”) are removed before the check.
 */

/**
 * A number as written in Polish: thousands only in groups of three („14 750”, also with a hard
 * space), so „7 9800” is two. Not the decimals of another number („12,4” is one); a number glued
 * to a unit („2500zł”) counts.
 */
const NUMBER = /(?<!\d|\d[.,])[-−–]?(?:\d{1,3}(?:[   ]\d{3})+(?!\d)|\d+)(?:[.,]\d+)?/gu

/** Numbers as written in a Polish text: „2 219 zł” → 2219, „−4,3%” → -4.3. */
export function numbersIn(text: string): number[] {
  const out: number[] = []
  for (const match of text.matchAll(NUMBER)) {
    const raw = match[0].replace(/[   ]/g, '').replace(/[−–]/, '-').replace(',', '.')
    const value = Number(raw)
    if (Number.isFinite(value)) out.push(value)
  }
  return out
}

/** Every way a number may be shown: as is, rounded, and shares as percents. */
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

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * The text without the given names (case-insensitive, longest first) and without their model
 * marks — words with a digit and a letter (Z890, 9800X3D) — also when the model inflects the
 * name around them („płytę Z890”, „Ryzena 7 9800X3D”). Bare numbers of a name go too when the
 * model shortens it („DDR5 32 GB 6000”, „360 mm”) — but never as a price or a percent: „6000 zł”
 * and „32%” stay and are checked.
 */
function withoutNames(text: string, names: readonly string[]): string {
  const withDigit = names.filter((n) => /\d/.test(n))
  const marks = withDigit
    .flatMap((n) => n.split(/\s+/))
    .filter((w) => /\d/.test(w) && /\p{L}/u.test(w))
  const all = [...new Set([...withDigit, ...marks])].sort((a, b) => b.length - a.length)
  let out = text
  for (const name of all) {
    out = out.replace(new RegExp(`(?<![\\p{L}\\d])${escape(name)}(?![\\p{L}\\d])`, 'giu'), ' ')
  }
  const bare = new Set(
    withDigit.flatMap((n) => n.match(/(?<![\p{L}\d.,])\d+(?![\p{L}\d])/gu) ?? []),
  )
  for (const n of bare) {
    out = out.replace(
      new RegExp(`(?<![\\p{L}\\d]|\\d[.,])${n}(?!\\d|[.,]\\d|\\s?(?:zł|%|proc))`, 'gu'),
      ' ',
    )
  }
  return out
}

/** Numbers of the summary that are not in the input (empty = the summary may be shown). */
export function unknownNumbers(
  summary: string,
  values: readonly number[],
  names: readonly string[] = [],
): number[] {
  const allowed = allowedNumbers(values)
  return numbersIn(withoutNames(summary, names)).filter((n) => {
    const abs = Math.abs(n)
    if (Number.isInteger(abs) && abs <= 10) return false
    return !allowed.has(String(abs))
  })
}

/** Every number anywhere in a JSON value, for `unknownNumbers`. */
export function numbersOf(value: unknown, out: number[] = []): number[] {
  if (typeof value === 'number') out.push(value)
  else if (Array.isArray(value)) for (const v of value) numbersOf(v, out)
  else if (value && typeof value === 'object')
    for (const v of Object.values(value)) numbersOf(v, out)
  return out
}

/** A margin as the panel shows it (`percentShort`: rounded down to one decimal), e.g. 10.9. */
const pct = (v: number | null) =>
  v === null || !Number.isFinite(v) ? null : Math.floor(v * 1000 + 1e-9) / 10

/** A change as the report table shows it (rounded to one decimal), e.g. −20.2. */
const pctChange = (v: number) => (Number.isFinite(v) ? Math.round(v * 1000) / 10 : null)

const KIND: Record<string, string> = {
  case: 'obudowy',
  cooler: 'chłodzenia',
  ram: 'pamięci RAM',
  ssd: 'dyski',
  cpu: 'procesory',
  gpu: 'karty graficzne',
  mobo: 'płyty główne',
  psu: 'zasilacze',
}

/**
 * What Claude gets for the summary: plain counts and the changed items and builds, with keys in
 * Polish and percents as in the panel — no batch number, codes or items without an offer (the
 * first real run read the batch number as a count and rounded 10,9% up to 11,0%). `names` are
 * the item and build names for `unknownNumbers`.
 */
export function summaryInput(diff: CheckDiff) {
  const t = diff.totals
  const changed = diff.items.filter(
    (i) => i.decision.kind !== 'same' && i.decision.kind !== 'nooffer',
  )
  const noOffer: Record<string, number> = {}
  for (const i of diff.items) {
    if (i.decision.kind !== 'nooffer') continue
    const kind = KIND[i.category] ?? i.category
    noOffer[kind] = (noOffer[kind] ?? 0) + 1
  }
  const buildsChanged = diff.builds.filter((b) => b.change !== null && b.change !== 0)
  const buildsNoPrice = diff.builds.filter((b) => b.change === null)
  const input = {
    liczby: {
      pozycjiWszystkich: t.items,
      pozycjiZOferta: t.found,
      propozycjiDoZatwierdzenia: t.proposals,
      doRecznegoSprawdzenia: t.manual,
      niedostepnych: t.unavailable,
      bezOferty: t.nooffer,
      bezOfertyWgRodzaju: noOffer,
      zKosztemZFaktury: t.invoice,
      zestawowWszystkich: diff.builds.length,
      zestawowZeZmianaCeny: buildsChanged.length,
      zestawowBezZmiany: diff.builds.length - buildsChanged.length - buildsNoPrice.length,
      zestawowBezCeny: buildsNoPrice.length,
      marzaMinimalnaProc: pct(t.minMargin),
      sredniaMarzaTerazProc: pct(t.averageNow),
      sredniaMarzaPoProc: pct(t.averageAfter),
      najnizszaMarzaTerazProc: pct(t.lowestNow),
      najnizszaMarzaPoProc: pct(t.lowestAfter),
    },
    zmianyPozycji: changed.map((i) => ({
      pozycja: i.title,
      rodzaj: KIND[i.category] ?? i.category,
      decyzja: i.decision.kind,
      kosztTerazZl: i.cost,
      kosztRynkowyZl: i.market,
      zmianaKosztuProc: 'change' in i.decision ? pctChange(i.decision.change) : null,
      cenaPozycjiTerazZl: i.priceNow,
      cenaPozycjiNowaZl: i.priceNew,
      zestawy: i.builds,
    })),
    zestawy: diff.builds.map((b) => ({
      zestaw: b.name,
      cenaTerazZl: b.priceNow,
      cenaNowaZl: b.priceNew,
      zmianaCenyZl: b.change,
      marzaTerazProc: pct(b.marginNow),
      marzaPoProc: pct(b.marginAfter),
    })),
  }
  const names = [...changed.map((i) => i.title), ...diff.builds.map((b) => b.name)]
  return { input, names }
}
