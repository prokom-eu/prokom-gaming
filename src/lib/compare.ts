/**
 * Porównywarka `/porownaj` (spec. §9). The verdict, the badges, „Z {A} na {B}: +X% za Y zł”, the
 * matrix colours and the parts table follow the JS of `boards/Porownywarka.dc.html` 1:1. Browser-
 * safe: public labels, sell prices (published snapshot) and stored FPS only (ADR-G002 §8.7, ADR-
 * G004). `lib/compare.server.ts` reads the database.
 */
import { RESOLUTION_LABELS, type FpsKind, type GameScale, type Resolution } from './fps'
import { firstParam, resolutionFromParam, RESOLUTION_PARAMS, SMOOTH_FPS } from './games'
import { zl } from './pricing/format'

export const MAX_SLOTS = 3
export const MIN_SLOTS = 2
export const REFRESH_RATES = [60, 144, 240] as const
export type RefreshRate = (typeof REFRESH_RATES)[number]

/** The board's starting view. */
export const COMPARE_DEFAULT = {
  slots: ['baba-jaga', 'wampir', 'weles'],
  game: 'cyberpunk-2077',
  resolution: 'qhd' as Resolution,
  hz: 144 as RefreshRate,
}

/** Games in the matrix before „Pokaż wszystkie 33 gry” and as quick chips (board `QUICK`). */
export const QUICK_GAMES = [
  'counter-strike-2',
  'fortnite',
  'valorant',
  'minecraft',
  'ea-sports-fc-27',
  'cyberpunk-2077',
  'wiedzmin-3',
  'gta-v',
] as const

/** Kind of game under its name in the matrix (board `KIND`). */
export const KIND_LABELS: Record<GameScale['kind'], string> = {
  esport: 'e-sport',
  aaa: 'fabularna i premiery',
  capped: 'blokada 60 klatek',
}

/** A build as the comparison shows it. `rank` = position in price order (board `ti`). */
export type CompareBuild = {
  slug: string
  name: string
  key: string
  accusative: string
  genitive: string
  epithet: string
  giftTitle: string
  gift: string
  tierRoman: string
  tierLabel: string
  price: number
  rank: number
  photo: { src: string; alt: string } | null
  cpu: string | null
  gpu: string | null
  ram: string | null
  disk: string | null
  psu: string | null
  cooler: string | null
  look: string
  /** „Do jakiego monitora” — the tier hint (board `mon` = `TIER_HINTS`). */
  monitor: string
}

export type CompareGame = GameScale & { slug: string; name: string }

/**
 * Numbers of all 16 builds in all 33 games — compact, it travels to the browser:
 * `fps[resolution][game][build]` (`null` = no number) and one kind letter per build
 * (`kinds[resolution][game]`, `-` = no number), builds in the order of `CompareData.builds`.
 */
export type CompareData = {
  builds: CompareBuild[]
  games: CompareGame[]
  fps: Record<Resolution, (number | null)[][]>
  kinds: Record<Resolution, string[]>
}

export type CompareState = {
  slots: string[]
  game: string
  resolution: Resolution
  hz: RefreshRate
  /** „Tylko różnice”. */
  diff: boolean
}

// ---------------------------------------------------------------------------------------------
// Address `?z=a,b,c&gra=&rozdz=&hz=&roznice=1` (spec. §2).
// ---------------------------------------------------------------------------------------------

type Params = URLSearchParams | Record<string, string | string[] | undefined>

/** The next build to add (board `add`): the cheapest one dearer than the last slot, else any. */
export function nextBuild(
  slots: readonly string[],
  builds: readonly CompareBuild[],
): string | null {
  const pool = builds.filter((b) => !slots.includes(b.slug))
  if (pool.length === 0) return null
  const last = builds.find((b) => b.slug === slots[slots.length - 1])
  const dearer = pool.filter((b) => !last || b.rank > last.rank).sort((a, b) => a.rank - b.rank)
  return (dearer[0] ?? pool[0])!.slug
}

/**
 * State from the address. Known builds only, no repeats, at most three; one build gets the next
 * one added (a link „Porównaj” from a build page), none gives the board's three.
 */
export function parseCompare(
  params: Params,
  data: Pick<CompareData, 'builds' | 'games'>,
): CompareState {
  const known = new Set(data.builds.map((b) => b.slug))
  const slots: string[] = []
  for (const slug of (firstParam(params, 'z') ?? '').split(',')) {
    const s = slug.trim()
    if (known.has(s) && !slots.includes(s) && slots.length < MAX_SLOTS) slots.push(s)
  }
  if (slots.length === 0) slots.push(...COMPARE_DEFAULT.slots.filter((s) => known.has(s)))
  while (slots.length < MIN_SLOTS) {
    const next = nextBuild(slots, data.builds)
    if (!next) break
    slots.push(next)
  }
  const game = firstParam(params, 'gra')
  const hz = Number(firstParam(params, 'hz'))
  return {
    slots,
    game: data.games.some((g) => g.slug === game)
      ? (game as string)
      : data.games.some((g) => g.slug === COMPARE_DEFAULT.game)
        ? COMPARE_DEFAULT.game
        : (data.games[0]?.slug ?? ''),
    resolution: resolutionFromParam(firstParam(params, 'rozdz')) ?? COMPARE_DEFAULT.resolution,
    hz: (REFRESH_RATES as readonly number[]).includes(hz)
      ? (hz as RefreshRate)
      : COMPARE_DEFAULT.hz,
    diff: firstParam(params, 'roznice') === '1',
  }
}

/** `?z=…&gra=…&rozdz=…&hz=…` (+ `&roznice=1`) — the link „Wyślij to porównanie” sends. */
export function compareQuery(state: CompareState): string {
  const parts = [
    `z=${state.slots.map(encodeURIComponent).join(',')}`,
    `gra=${encodeURIComponent(state.game)}`,
    `rozdz=${RESOLUTION_PARAMS[state.resolution]}`,
    `hz=${state.hz}`,
  ]
  if (state.diff) parts.push('roznice=1')
  return `?${parts.join('&')}`
}

// ---------------------------------------------------------------------------------------------
// The view (board `renderVals`).
// ---------------------------------------------------------------------------------------------

export type SlotNumber = { fps: number; kind: FpsKind } | null

export type Badge = {
  text: 'Najwięcej klatek' | 'Wystarczy' | 'Jedyny, który da radę'
  tone: 'gold' | 'ok'
}

export type Verdict = {
  /** Slug of the build whose colour the box takes; `null` = the board's own colour. */
  color: string | null
  tone: 'ok' | 'low' | 'capped'
  title: string
  text: string
  more: string | null
  /** „Wstaw {X} do porównania”: the build to add (accusative in `suggestName`). */
  suggest: string | null
  suggestName: string | null
}

export type Step = { from: string; to: string; color: string; gain: string; extra: string }

export type MatrixCell = {
  value: string
  tone: 'low' | 'ok' | 'full' | 'cap' | 'none'
  kind: FpsKind | null
}
export type MatrixRow = {
  game: string
  name: string
  kind: string
  selected: boolean
  cells: MatrixCell[]
}

export type SpecValue = { text: string; tone: '' | 'dif' | 'dif best' }
export type SpecRow =
  | { group: string; hidden: boolean }
  | { label: string; hint: string; same: boolean; hidden: boolean; values: SpecValue[] }

export type CompareView = {
  builds: CompareBuild[]
  game: CompareGame
  capped: boolean
  numbers: SlotNumber[]
  badges: (Badge | null)[]
  /** Index of the build with most frames (gold frame on the board), `null` when capped. */
  top: number | null
  verdict: Verdict
  steps: Step[]
  /** Position of each slot on the chart, in % of the track, and of the 60 / Hz lines. */
  chart: { points: (number | null)[]; line60: number; lineHz: number | null }
  matrix: MatrixRow[]
  spec: SpecRow[]
}

const pct = (a: number, b: number) => Math.round(((a - b) / b) * 100)

/** "o 36% więcej" / "+20% klatek" — the board rounds the same way for both. */
export function gainText(gain: number): string {
  return `${gain >= 0 ? '+' : ''}${gain}% klatek`
}

/** "8" from "8 GB", 1000 from "1 TB" (board `num`): the size the parts table compares. */
export function sizeOf(label: string): number {
  const m = label.match(/(\d+)/)
  return m ? Number(m[1]) * (label.includes('TB') ? 1000 : 1) : 0
}

export function numberOf(
  data: CompareData,
  state: Pick<CompareState, 'resolution'>,
  gameIndex: number,
  slug: string,
): SlotNumber {
  const b = data.builds.findIndex((x) => x.slug === slug)
  const fps = data.fps[state.resolution][gameIndex]?.[b]
  const kind = data.kinds[state.resolution][gameIndex]?.[b]
  return fps == null || !isKind(kind) ? null : { fps, kind }
}

const isKind = (value: string | undefined): value is FpsKind =>
  value === 'p' || value === 'm' || value === 'r' || value === 'e'

export function compareView(
  data: CompareData,
  state: CompareState,
  showAll: boolean,
): CompareView | null {
  const gameIndex = data.games.findIndex((g) => g.slug === state.game)
  const game = data.games[gameIndex]
  const builds = state.slots
    .map((s) => data.builds.find((b) => b.slug === s))
    .filter((b): b is CompareBuild => Boolean(b))
  if (!game || builds.length === 0) return null

  const capped = game.kind === 'capped'
  const esport = game.kind === 'esport'
  const target = esport ? state.hz : SMOOTH_FPS
  const numbers = builds.map((b) => numberOf(data, state, gameIndex, b.slug))
  const fpsAt = (i: number) => numbers[i]?.fps ?? null
  const shown = (i: number) => (capped ? String(game.fpsCap ?? SMOOTH_FPS) : String(fpsAt(i)))
  const withNumber = builds.map((_, i) => i).filter((i) => fpsAt(i) !== null)
  const maxFps = Math.max(0, ...withNumber.map((i) => fpsAt(i)!))
  const minFps = Math.min(...withNumber.map((i) => fpsAt(i)!))

  const ok = withNumber.filter((i) => fpsAt(i)! >= target)
  let best: number | null = null
  for (const i of ok) if (best === null || builds[i]!.rank < builds[best]!.rank) best = i
  const topIndex = withNumber.find((i) => fpsAt(i) === maxFps) ?? null
  const n = builds.length

  const badges: (Badge | null)[] = builds.map((_, i) => {
    if (capped) return null
    let badge: Badge | null = null
    if (i === topIndex && n > 1 && maxFps > minFps)
      badge = { text: 'Najwięcej klatek', tone: 'gold' }
    if (best !== null && i === best && i !== topIndex) badge = { text: 'Wystarczy', tone: 'ok' }
    if (best !== null && i === best && i === topIndex && ok.length === 1) {
      badge = { text: 'Jedyny, który da radę', tone: 'gold' }
    }
    return badge
  })

  // Verdict.
  const why = esport
    ? `tyle, ile pokaże Twój monitor ${state.hz} Hz`
    : 'płynna gra, powyżej 60 klatek'
  const res = RESOLUTION_LABELS[state.resolution]
  let verdict: Verdict
  if (withNumber.length === 0) {
    // No number for these builds in this game: no promise either (ADR-G004).
    // TODO(krystian): wording (not on the board).
    verdict = {
      color: null,
      tone: 'low',
      title: 'Brak wyników dla tej gry',
      text: 'Brak wyników dla tych komputerów w tej grze.',
      more: null,
      suggest: null,
      suggestName: null,
    }
  } else if (capped) {
    verdict = {
      color: null,
      tone: 'capped',
      title: 'Tu dopłata nic nie zmieni',
      text: `${game.name} ma blokadę ${game.fpsCap ?? SMOOTH_FPS} klatek, więc każdy z tych komputerów da płynne ${game.fpsCap ?? SMOOTH_FPS}. Wybierz ten, który pasuje do innych gier, w które grasz.`,
      more: null,
      suggest: null,
      suggestName: null,
    }
  } else if (best !== null) {
    const b = builds[best]!
    let more: string | null = null
    if (topIndex !== null && topIndex !== best) {
      const t = builds[topIndex]!
      more = `${t.name} da o ${pct(fpsAt(topIndex)!, fpsAt(best)!)}% więcej klatek, za dopłatę ${zl(t.price - b.price)}. ${
        esport
          ? 'Warto, jeśli planujesz szybszy monitor.'
          : 'Warto, jeśli chcesz zapasu na kolejne premiery albo wyższą rozdzielczość.'
      }`
    }
    verdict = {
      color: b.slug,
      tone: 'ok',
      title: `${b.name}${best === topIndex ? ' to dobry wybór' : ' wystarczy'}`,
      text: `${b.name} da ${shown(best)} klatek, czyli ${why}.`,
      more,
      suggest: null,
      suggestName: null,
    }
  } else {
    const t = topIndex === null ? null : builds[topIndex]!
    const all = [...data.builds].sort((a, b) => a.rank - b.rank)
    const s = all.find((b) => {
      const v = numberOf(data, state, gameIndex, b.slug)
      return v !== null && v.fps >= target && !state.slots.includes(b.slug)
    })
    const sFps = s ? numberOf(data, state, gameIndex, s.slug)!.fps : null
    verdict = {
      color: null,
      tone: 'low',
      title: 'Za mało mocy na ten monitor',
      text: t
        ? `Najwięcej da ${t.name}: ${fpsAt(topIndex!)} klatek. To mniej niż ${
            esport
              ? `${state.hz} klatek, które pokaże monitor ${state.hz} Hz`
              : '60 klatek, od których gra jest płynna'
          }.`
        : 'Brak wyników dla tych komputerów w tej grze.',
      more: s
        ? `Do pełnej płynności w ${game.name} w ${res} wystarczy ${s.name} (Moc ${s.tierRoman}): ${sFps} klatek.`
        : `Tu nawet Perun nie da pełnych ${target} klatek. Zmniejsz ustawienia graficzne albo rozdzielczość: napisz, w co grasz, a podpowiemy, co ustawić.`,
      suggest: s?.slug ?? null,
      suggestName: s?.accusative ?? null,
    }
  }

  // „Z {A} na {B}” (by price order).
  const order = builds.map((_, i) => i).sort((a, b) => builds[a]!.rank - builds[b]!.rank)
  const steps: Step[] = []
  if (!capped) {
    for (let k = 1; k < order.length; k++) {
      const a = order[k - 1]!
      const b = order[k]!
      if (fpsAt(a) === null || fpsAt(b) === null) continue
      steps.push({
        from: builds[a]!.genitive,
        to: builds[b]!.accusative,
        color: builds[b]!.slug,
        gain: gainText(pct(fpsAt(b)!, fpsAt(a)!)),
        extra: zl(builds[b]!.price - builds[a]!.price),
      })
    }
  }

  // Chart: the scale ends 12% above the highest of the numbers, the monitor and 60.
  const scale = Math.max(maxFps, state.hz, SMOOTH_FPS) * 1.12
  const at = (v: number) => Math.round((v / scale) * 10000) / 100
  const chart = {
    points: builds.map((_, i) => (fpsAt(i) === null ? null : at(fpsAt(i)!))),
    line60: at(SMOOTH_FPS),
    lineHz: state.hz === SMOOTH_FPS ? null : at(state.hz),
  }

  // Matrix.
  const listed = showAll
    ? data.games
    : data.games.filter(
        (g) => (QUICK_GAMES as readonly string[]).includes(g.slug) || g.slug === state.game,
      )
  const matrix: MatrixRow[] = listed.map((g) => {
    const gi = data.games.indexOf(g)
    return {
      game: g.slug,
      name: g.name,
      kind: KIND_LABELS[g.kind],
      selected: g.slug === state.game,
      cells: builds.map((b) => {
        const v = numberOf(data, state, gi, b.slug)
        if (!v) return { value: 'brak', tone: 'none', kind: null }
        if (g.kind === 'capped')
          return { value: String(g.fpsCap ?? v.fps), tone: 'cap', kind: v.kind }
        return {
          value: String(v.fps),
          tone: v.fps >= state.hz ? 'full' : v.fps >= SMOOTH_FPS ? 'ok' : 'low',
          kind: v.kind,
        }
      }),
    }
  })

  return {
    builds,
    game,
    capped,
    numbers,
    badges,
    top: capped || n < 2 ? null : topIndex,
    verdict,
    steps,
    chart,
    matrix,
    spec: specRows(builds, state.diff),
  }
}

type SpecDef = {
  label: string
  hint: string
  value: (b: CompareBuild) => string
  /** `rank` / `size`: differences get a „best” mark on the highest. */
  best?: 'rank' | 'size'
}

const SPEC: (SpecDef | { group: string })[] = [
  { group: 'Moc' },
  {
    label: 'Poziom mocy',
    hint: 'im wyżej, tym więcej klatek',
    value: (b) => `Moc ${b.tierRoman}, ${b.tierLabel}`,
    best: 'rank',
  },
  { label: 'Procesor', hint: 'liczy fizykę, postacie i AI w grze', value: (b) => b.cpu ?? '—' },
  {
    label: 'Karta graficzna',
    hint: 'najważniejsza dla klatek i rozdzielczości',
    value: (b) => b.gpu ?? '—',
  },
  {
    label: 'Pamięć RAM',
    hint: 'gry, Discord i przeglądarka naraz',
    value: (b) => b.ram ?? '—',
    best: 'size',
  },
  { label: 'Dysk', hint: 'ile gier zmieści się naraz', value: (b) => b.disk ?? '—', best: 'size' },
  {
    label: 'Zasilacz',
    hint: 'zapas na mocniejszą kartę w przyszłości',
    value: (b) => b.psu ?? '—',
    best: 'size',
  },
  {
    label: 'Chłodzenie',
    hint: 'wodne jest cichsze pod obciążeniem',
    value: (b) => b.cooler ?? '—',
  },
  { label: 'Do jakiego monitora', hint: 'nasza rekomendacja', value: (b) => b.monitor },
  { group: 'Wygląd' },
  {
    label: 'Obudowa i światło',
    hint: 'kolor podświetlenia zmienisz w konfiguratorze',
    value: (b) => b.look,
  },
  { group: 'W cenie każdego' },
  { label: 'Gwarancja', hint: '', value: () => '2 lata na cały komputer' },
  {
    label: 'Test obciążeniowy i pomiar klatek',
    hint: 'wyniki tego egzemplarza w dokumencie',
    value: () => 'tak, z metryką',
  },
  { label: 'System', hint: '', value: () => 'Windows 11, aktywowany' },
  {
    label: 'Czas realizacji',
    hint: 'od zaksięgowania płatności',
    value: () => '5–10 dni roboczych',
  },
  { label: 'Odbiór', hint: 'Rabka-Zdrój', value: () => 'kurier albo sklep' },
]

/**
 * „Podzespoły i to, co w cenie” (board `SPEC`): differences marked, the highest power level or
 * size marked „best” (unless all share it); „Tylko różnice” hides equal rows and empty groups.
 */
export function specRows(builds: readonly CompareBuild[], diff: boolean): SpecRow[] {
  const rows: SpecRow[] = []
  for (const def of SPEC) {
    if ('group' in def) {
      rows.push({ group: def.group, hidden: false })
      continue
    }
    const texts = builds.map(def.value)
    const same = texts.every((t) => t === texts[0])
    let values: SpecValue[] = texts.map((text) => ({ text, tone: same ? '' : 'dif' }))
    if (!same && def.best) {
      const scores = builds.map((b, i) => (def.best === 'rank' ? b.rank : sizeOf(texts[i]!)))
      const top = Math.max(...scores)
      const unique = scores.filter((s) => s === top).length < scores.length
      values = texts.map((text, i) => ({
        text,
        tone: unique && scores[i] === top ? 'dif best' : 'dif',
      }))
    }
    rows.push({ label: def.label, hint: def.hint, same, hidden: diff && same, values })
  }
  if (diff) {
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]!
      if (!('group' in row)) continue
      let any = false
      for (let j = i + 1; j < rows.length && !('group' in rows[j]!); j++) {
        if (!rows[j]!.hidden) any = true
      }
      row.hidden = !any
    }
  }
  return rows
}

/** „Baba Jaga, Moc VI, 11 650 zł” — the option of a slot's select (board). */
export function slotOption(b: CompareBuild): string {
  return `${b.name}, Moc ${b.tierRoman}, ${zl(b.price)}`
}
