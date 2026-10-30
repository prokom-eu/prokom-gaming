/**
 * Inquiry form `/zapytanie` (spec. §10, board Formularz): state of the four steps, entry from an
 * address, validation with the board's messages, the live summary and the body for
 * `POST /api/inquiry`. Browser-safe and pure; the page keeps the state, the server re-checks
 * everything (ADR-G005) — the price shown here is only a preview from the same function.
 */
import { compatMessage } from '../compat'
import { decodeConfig, encodeConfig } from '../configurator'
import type { PriceSnapshot } from '../pricing/snapshot'
import { ITEM_CODE, type Config } from '../pricing/types'
import { CONSENT_CLAUSE } from './consent'
import { FORM_TOKEN_FIELD, HONEYPOT_FIELD } from './honeypot'
import { isValidNip } from './nip'
import { priceComputer, type InquiryOffer } from './price'
import { isPhone, PAYLOAD_EMAIL } from './rules'
import {
  BUDGET_CHOICES,
  CASE_COLOR_CHOICES,
  EXTRA_CHOICES,
  FOR_WHOM_CHOICES,
  INVOICE_CHOICES,
  labelOf,
  LIGHT_COLOR_CHOICES,
  LIGHTING_CHOICES,
  MONITOR_CHOICES,
  PICKUP_CHOICES,
  PREFERRED_CONTACT_CHOICES,
  REFRESH_CHOICES,
  type InquiryType,
  type LightColor,
} from './types'

type Value<T extends readonly { value: string }[]> = T[number]['value']

// ---------------------------------------------------------------------------------------------
// Data from the server and the state of the form
// ---------------------------------------------------------------------------------------------

export const STEPS = ['Komputer', 'Gry i wygląd', 'Kontakt', 'Wyślij'] as const
export type Step = 0 | 1 | 2 | 3
export const LAST_STEP: Step = 3
export const NEXT_LABELS = ['Dalej: gry i wygląd', 'Dalej: kontakt', 'Dalej: sprawdź'] as const

export type Mode = 'build' | 'advice' | 'list'
export const MODES: readonly { value: Mode; title: string; text: string }[] = [
  { value: 'build', title: 'Wiem, który zestaw', text: 'Wybierzesz jedną z szesnastu istot.' },
  { value: 'advice', title: 'Pomóżcie mi dobrać', text: 'Powiesz, w co grasz i ile chcesz wydać.' },
  { value: 'list', title: 'Mam własną listę', text: 'Wkleisz konfigurację albo link.' },
]

/** Game buttons of step 2, in the board's order (other games go to the text field). */
export const FORM_GAMES = [
  'counter-strike-2',
  'fortnite',
  'valorant',
  'league-of-legends',
  'minecraft',
  'roblox',
  'ea-sports-fc-27',
  'call-of-duty-warzone',
  'gta-v',
  'cyberpunk-2077',
  'wiedzmin-3',
  'battlefield-6',
] as const

/** A build as the form shows it: sigil, name, „Moc VII, 4K”. */
export type FormBuild = {
  slug: string
  name: string
  key: string
  power: string
  realm: string
}

/** Public face of a power level: its tier and the class of CPU and GPU (`publicLabel`). */
export type FormLevel = {
  power: string
  realm: string
  build: string
  cpu: string
  gpu: string
}

export type FormData = {
  /** Rules and recipes without costs (`loadInquiryOffer`), for the price preview. */
  offer: InquiryOffer
  /** Newest published batch; `null` before the first publication (no price shown). */
  snapshot: PriceSnapshot | null
  labels: { level: Record<string, string>; option: Record<string, string> }
  /** In tier order, like the board's grid. */
  builds: FormBuild[]
  levels: Record<string, FormLevel>
  games: { slug: string; name: string }[]
}

export type FormState = {
  step: Step
  mode: Mode
  build: string | null
  /** Changes to the build's recipe from „Dopasuj” on the build page (memory, disk). */
  changes: Partial<Config>
  /** Full configuration from the configurator (`k`); while set, it is the computer. */
  config: Config | null
  /** Light colour from „Dopasuj” / the configurator; `null` = the creature's own light. */
  light: LightColor | null
  /** Builds of the comparison (`z`); the inquiry is then of type `compare`. */
  compared: string[]
  forWhom: Value<typeof FOR_WHOM_CHOICES> | null
  budget: Value<typeof BUDGET_CHOICES> | null
  customList: string
  games: string[]
  otherGames: string
  monitor: Value<typeof MONITOR_CHOICES> | null
  refresh: Value<typeof REFRESH_CHOICES> | null
  caseColor: Value<typeof CASE_COLOR_CHOICES> | null
  lighting: Value<typeof LIGHTING_CHOICES> | null
  extras: Value<typeof EXTRA_CHOICES>[]
  name: string
  email: string
  phone: string
  preferredContact: Value<typeof PREFERRED_CONTACT_CHOICES>
  pickup: Value<typeof PICKUP_CHOICES>
  invoice: Value<typeof INVOICE_CHOICES>
  nip: string
  message: string
  consent: boolean
  marketingConsent: boolean
  /** Steps the customer tried to leave: their errors show from then on (board `tried`). */
  tried: [boolean, boolean, boolean, boolean]
}

const EMPTY: FormState = {
  step: 0,
  mode: 'build',
  build: null,
  changes: {},
  config: null,
  light: null,
  compared: [],
  forWhom: null,
  budget: null,
  customList: '',
  games: [],
  otherGames: '',
  // Not preselected (the board shows sample choices): the team must see what the customer chose.
  monitor: null,
  refresh: null,
  caseColor: null,
  lighting: null,
  extras: [],
  name: '',
  email: '',
  phone: '',
  // Preselected like the board: the usual answer, and each is still visible on the review step.
  preferredContact: 'email',
  pickup: 'courier',
  invoice: 'private',
  nip: '',
  message: '',
  consent: false,
  marketingConsent: false,
  tried: [false, false, false, false],
}

// ---------------------------------------------------------------------------------------------
// Entry: from the address (build page, configurator, comparison) or the saved draft
// ---------------------------------------------------------------------------------------------

const isLight = (value: unknown): value is LightColor =>
  LIGHT_COLOR_CHOICES.some((c) => c.value === value)

function cleanChanges(value: unknown): Partial<Config> {
  if (!value || typeof value !== 'object') return {}
  const out: Partial<Config> = {}
  for (const key of ['ram', 'ssd'] as const) {
    const code = (value as Record<string, unknown>)[key]
    if (typeof code === 'string' && ITEM_CODE.test(code)) out[key] = code
  }
  return out
}

/** Longest text carried in an address (`inne` of the configurator). */
const ADDRESS_TEXT_MAX = 200

/**
 * Starting state. Priority of the address: `k` (configurator) > `z` (comparison) > `zestaw`
 * (build page). Unknown slugs and malformed codes are ignored — a
 * stale link opens an empty first step, never an error.
 */
export function initialState(params: URLSearchParams, data: Pick<FormData, 'builds'>): FormState {
  const known = new Set(data.builds.map((b) => b.slug))
  const nameOf = (slug: string) => data.builds.find((b) => b.slug === slug)?.name ?? slug
  const state: FormState = { ...EMPTY, tried: [false, false, false, false] }
  const notes: string[] = []

  const config = decodeConfig(params.get('k'))
  const compared = [...new Set((params.get('z') ?? '').split(','))]
    .filter((slug) => known.has(slug))
    .slice(0, 3)
  const build = params.get('zestaw')

  if (config) {
    state.config = config
  } else if (compared.length > 0) {
    state.compared = compared
    state.build = compared[0] ?? null
    if (compared.length > 1) notes.push(`Z porównania: ${compared.map(nameOf).join(', ')}.`)
  } else if (build && known.has(build)) {
    state.build = build
    state.changes = cleanChanges({ ram: params.get('ram'), ssd: params.get('ssd') })
  }

  const light = params.get('swiatlo')
  if (isLight(light)) state.light = light

  const other = Array.from((params.get('inne') ?? '').trim())
    .slice(0, ADDRESS_TEXT_MAX)
    .join('')
  // The configurator's „Chcesz obudowę albo chłodzenie, których nie ma na liście?”.
  if (other) notes.push(`Obudowa albo chłodzenie spoza listy: ${other}`)
  state.message = notes.join('\n')
  return state
}

/** Parameters that name a computer; without them the form returns to the saved draft. */
export function hasComputer(params: URLSearchParams): boolean {
  return ['k', 'z', 'zestaw'].some((key) => params.has(key))
}

/**
 * What `pkg:inquiry` keeps (the shell counts its items): the address that opens the picked
 * computer again, or nothing. A return visit to `/zapytanie` goes to that address, so the address
 * stays the one way into the form.
 */
export function draftOf(state: FormState): string[] {
  if (state.mode !== 'build') return []
  const params = new URLSearchParams()
  if (state.config) params.set('k', encodeConfig(state.config))
  else if (!state.build) return []
  else if (state.compared.length > 0) {
    const others = state.compared.filter((slug) => slug !== state.build)
    params.set('z', [state.build, ...others].join(','))
  } else {
    params.set('zestaw', state.build)
    if (state.changes.ram) params.set('ram', state.changes.ram)
    if (state.changes.ssd) params.set('ssd', state.changes.ssd)
  }
  if (state.light) params.set('swiatlo', state.light)
  return [params.toString()]
}

/** Query of a stored draft; `null` for anything unreadable (the form parses it like any link). */
export function draftQuery(raw: string | null): string | null {
  if (!raw) return null
  try {
    const value: unknown = JSON.parse(raw)
    const first: unknown = Array.isArray(value) ? value[0] : null
    return typeof first === 'string' && first.length > 0 && first.length <= 500 ? first : null
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------------------------
// Changes
// ---------------------------------------------------------------------------------------------

/** Picking a sigil: a new build drops the changes made to another build's recipe. */
export function pickBuild(state: FormState, slug: string): FormState {
  if (state.build === slug && !state.config) return state
  return { ...state, build: slug, config: null, changes: {} }
}

export function toggle<T extends string>(list: readonly T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value]
}

// ---------------------------------------------------------------------------------------------
// The computer, its type and price
// ---------------------------------------------------------------------------------------------

type ComputerRequest = { build?: string; config?: Partial<Config> }

/** What the API gets as the computer; `null` when the customer did not pick one. */
export function computerRequest(state: FormState): ComputerRequest | null {
  if (state.mode !== 'build') return null
  if (state.config) return { config: state.config }
  if (!state.build) return null
  return Object.keys(state.changes).length > 0
    ? { build: state.build, config: state.changes }
    : { build: state.build }
}

export function inquiryType(state: FormState): InquiryType {
  if (state.mode === 'advice') return 'advice'
  if (state.mode === 'list') return 'custom_list'
  if (state.config) return 'config'
  return state.compared.length > 0 ? 'compare' : 'build'
}

export type Priced = { ok: true; price: number; config: Config } | { ok: false; reason: string }

/**
 * Price preview with the server's own function (`priceComputer`); `null` without a computer or
 * without published prices. A failure carries the customer-facing reason.
 */
export function priceOf(state: FormState, data: FormData): Priced | null {
  const request = computerRequest(state)
  if (!request || !data.snapshot) return null
  const result = priceComputer(request, data.offer, data.snapshot)
  if (result.ok) return { ok: true, price: result.price, config: result.config }
  const level = data.offer.levels.find((l) => l.code === (request.config?.level ?? ''))
  const reason =
    result.compat && level
      ? result.compat.map((code) => compatMessage(code, level)).join('. ') + '.'
      : UNAVAILABLE_COMPUTER
  return { ok: false, reason }
}

// TODO(krystian): wording (not on the board) — a configuration that cannot be priced any more.
const UNAVAILABLE_COMPUTER =
  'Tej konfiguracji nie możemy dziś wycenić. Wybierz zestaw albo opisz w uwagach, czego szukasz.'

/** The recipe the customer asks about (for labels): the configuration, or the build with changes. */
function recipeOf(state: FormState, data: FormData): Config | null {
  if (state.mode !== 'build') return null
  if (state.config) return state.config
  const build = data.offer.builds.find((b) => b.slug === state.build)
  return build ? { ...build.config, ...state.changes } : null
}

/** The creature that stands for the computer: the build, or the level's own build of a config. */
export function creatureOf(state: FormState, data: FormData): FormBuild | null {
  if (state.mode !== 'build') return null
  const slug = state.config ? data.levels[state.config.level]?.build : state.build
  return data.builds.find((b) => b.slug === slug) ?? null
}

// ---------------------------------------------------------------------------------------------
// Validation (board texts; missing ones marked)
// ---------------------------------------------------------------------------------------------

export type FieldKey = 'computer' | 'customList' | 'name' | 'email' | 'phone' | 'nip' | 'consent'
export type FieldErrors = Partial<Record<FieldKey, string>>

export const MESSAGES = {
  computer: 'Wybierz komputer albo zaznacz wyżej „Pomóżcie mi dobrać”.',
  // TODO(krystian): wording (not on the board).
  customList: 'Wklej listę części albo link do konfiguracji.',
  name: 'Wpisz imię, żebyśmy wiedzieli, jak się do Ciebie zwracać.',
  emailEmpty: 'Wpisz e-mail, na który wyślemy ofertę.',
  emailInvalid:
    'Ten e-mail wygląda na niepełny. Sprawdź, czy jest w nim @ i domena, np. jan@gmail.com.',
  // TODO(krystian): wording of the phone and NIP messages (not on the board).
  phoneEmpty: 'Wpisz numer, pod który mamy zadzwonić.',
  phoneInvalid: 'Ten numer wygląda na niepełny. Wpisz co najmniej 6 cyfr, np. 600 100 200.',
  nipEmpty: 'Wpisz NIP firmy, na którą wystawimy fakturę.',
  nipInvalid: 'Ten NIP się nie zgadza. Sprawdź 10 cyfr z dokumentów firmy.',
  consent: 'Zaznacz zgodę, żebyśmy mogli odpisać z ofertą.',
} as const

/** Errors of one step, whether shown yet or not. */
export function stepErrors(state: FormState, data: FormData, step: Step): FieldErrors {
  const errors: FieldErrors = {}
  if (step === 0) {
    if (state.mode === 'build') {
      if (!computerRequest(state)) errors.computer = MESSAGES.computer
      else {
        const priced = priceOf(state, data)
        if (priced && !priced.ok) errors.computer = priced.reason
      }
    }
    if (state.mode === 'list' && !state.customList.trim()) errors.customList = MESSAGES.customList
  }
  if (step === 2) {
    const email = state.email.trim()
    const phone = state.phone.trim()
    if (!state.name.trim()) errors.name = MESSAGES.name
    if (!email) errors.email = MESSAGES.emailEmpty
    else if (!PAYLOAD_EMAIL.test(email)) errors.email = MESSAGES.emailInvalid
    if (phone && !isPhone(phone)) errors.phone = MESSAGES.phoneInvalid
    else if (!phone && state.preferredContact === 'phone') errors.phone = MESSAGES.phoneEmpty
    if (state.invoice === 'company') {
      if (!state.nip.trim()) errors.nip = MESSAGES.nipEmpty
      else if (!isValidNip(state.nip)) errors.nip = MESSAGES.nipInvalid
    }
    if (!state.consent) errors.consent = MESSAGES.consent
  }
  return errors
}

/** Errors to show: only on steps the customer already tried to leave. */
export function visibleErrors(state: FormState, data: FormData): FieldErrors {
  return state.tried[state.step] ? stepErrors(state, data, state.step) : {}
}

const hasErrors = (errors: FieldErrors) => Object.keys(errors).length > 0

/**
 * Moving to a step (board `go`): back always; forward stops on the first step with errors and
 * marks it as tried, so its messages appear.
 */
export function goTo(state: FormState, data: FormData, target: Step): FormState {
  if (target <= state.step) return { ...state, step: target }
  for (let k = state.step; k < target; k++) {
    const step = k as Step
    if (hasErrors(stepErrors(state, data, step))) {
      const tried = [...state.tried] as FormState['tried']
      tried[step] = true
      return { ...state, step, tried }
    }
  }
  return { ...state, step: target }
}

/** Every step before sending is valid (the review step has nothing of its own). */
export function canSend(state: FormState, data: FormData): boolean {
  return ([0, 1, 2] as const).every((step) => !hasErrors(stepErrors(state, data, step)))
}

// ---------------------------------------------------------------------------------------------
// Answer 400 of the API → the step to correct
// ---------------------------------------------------------------------------------------------

const FIELD_STEP: Record<string, Step> = {
  build: 0,
  config: 0,
  lightColor: 0,
  forWhom: 0,
  budget: 0,
  customList: 0,
  games: 1,
  otherGames: 1,
  monitor: 1,
  refresh: 1,
  caseColor: 1,
  lighting: 1,
  extras: 1,
}

/** Step of the first rejected field (`config.ram` → 0, `email` → 2); contact data by default. */
export function stepOfFields(fields: readonly string[]): Step {
  const steps = fields.map((f) => FIELD_STEP[f.split('.')[0] ?? ''] ?? 2)
  return steps.length > 0 ? (Math.min(...steps) as Step) : 2
}

// TODO(krystian): wording of the send errors (not on the board).
export const SEND_ERRORS = {
  invalid: 'Coś się nie zgadza w zaznaczonym kroku. Popraw i wyślij jeszcze raz.',
  rate_limited: 'Wysłano już kilka zapytań z tego adresu. Spróbuj za kilka minut albo zadzwoń.',
  expired: 'Formularz był otwarty zbyt długo. Odśwież stronę i wyślij jeszcze raz.',
  unavailable: 'Nie udało się wysłać zapytania. Spróbuj za chwilę albo zadzwoń.',
} as const

// ---------------------------------------------------------------------------------------------
// Live summary, review step, „Twoja konfiguracja” after sending
// ---------------------------------------------------------------------------------------------

export type Row = { label: string; value: string }
export type ReviewRow = Row & { step: Step }

const label = <T extends readonly { value: string; label: string }[]>(
  choices: T,
  value: Value<T> | null,
): string | null => (value === null ? null : labelOf(choices, value))

const lower = (text: string) => text.charAt(0).toLowerCase() + text.slice(1)
const NONE = 'nie wybrano'

function gameNames(state: FormState, data: FormData): string[] {
  return state.games.map((slug) => data.games.find((g) => g.slug === slug)?.name ?? slug)
}

function monitorText(state: FormState): string {
  const parts = [label(MONITOR_CHOICES, state.monitor), label(REFRESH_CHOICES, state.refresh)]
  const chosen = parts.filter((p): p is string => p !== null)
  return chosen.length > 0 ? chosen.join(', ') : NONE
}

const lightText = (state: FormState) =>
  state.light ? `światło ${labelOf(LIGHT_COLOR_CHOICES, state.light)}` : null

/** „Wampir, Moc VII, 4K, pamięć 64 GB, światło Lód” — what the customer asks about. */
export function computerText(state: FormState, data: FormData): string {
  if (state.mode === 'advice') {
    const who = label(FOR_WHOM_CHOICES, state.forWhom) ?? 'dla kogo: nie podano'
    const budget = label(BUDGET_CHOICES, state.budget)
    return `Dobór. ${who}${budget ? `, budżet ${budget}` : ''}`
  }
  if (state.mode === 'list') return `Własna lista: ${state.customList.trim() || 'nie wpisano'}`
  const creature = creatureOf(state, data)
  if (!creature) return NONE
  const { option } = data.labels
  const parts: (string | null)[] = state.config
    ? [
        `${creature.name}, konfiguracja`,
        data.levels[state.config.level]?.power ?? null,
        option[state.config.case] ?? null,
        option[state.config.cooler] ?? null,
        option[state.config.ram] ?? null,
        option[state.config.ssd] ?? null,
      ]
    : [
        creature.name,
        creature.power,
        creature.realm,
        state.changes.ram ? `pamięć ${option[state.changes.ram] ?? state.changes.ram}` : null,
        state.changes.ssd ? `dysk ${option[state.changes.ssd] ?? state.changes.ssd}` : null,
      ]
  return [...parts, lightText(state)].filter((p): p is string => Boolean(p)).join(', ')
}

export type Summary = {
  /** Sigil of the computer; `null` for advice and a custom list. */
  key: string | null
  title: string
  sub: string
  /** Price preview; `null` when there is nothing to price (or no published prices). */
  price: number | null
  rows: Row[]
}

/** „Twoje zapytanie” beside the form (board `sum`). */
export function summaryOf(state: FormState, data: FormData): Summary {
  const creature = creatureOf(state, data)
  const priced = priceOf(state, data)
  let title: string
  let sub: string
  if (state.mode === 'advice') {
    title = 'Dobór komputera'
    sub = 'dobierzemy najlepszy w budżecie'
  } else if (state.mode === 'list') {
    title = 'Własna konfiguracja'
    sub = 'sprawdzimy i wycenimy'
  } else if (creature) {
    title = creature.name
    sub = [
      state.config ? 'Twoja konfiguracja' : `${creature.power}, ${creature.realm}`,
      lightText(state),
    ]
      .filter(Boolean)
      .join(', ')
  } else {
    title = 'Wybierz komputer'
    sub = 'jeszcze nic nie wybrano'
  }

  const games = gameNames(state, data)
  const rows: Row[] = [
    {
      label: 'Gry',
      value:
        games.length > 0
          ? games.slice(0, 2).join(', ') + (games.length > 2 ? ` i ${games.length - 2} inne` : '')
          : NONE,
    },
    { label: 'Monitor', value: monitorText(state) },
  ]
  const budget = label(BUDGET_CHOICES, state.budget)
  if (state.mode === 'advice' && budget) rows.push({ label: 'Budżet', value: budget })
  if (state.extras.length > 0) {
    rows.push({
      label: 'Dodatki',
      value: state.extras.map((e) => labelOf(EXTRA_CHOICES, e)).join(', '),
    })
  }
  rows.push({ label: 'Odbiór', value: labelOf(PICKUP_CHOICES, state.pickup) })

  return {
    key: creature?.key ?? null,
    title,
    sub,
    price: priced?.ok ? priced.price : null,
    rows,
  }
}

/** „Sprawdź i wyślij” (board `review`): each row with the step its „Zmień” opens. */
export function reviewOf(state: FormState, data: FormData): ReviewRow[] {
  const games = [...gameNames(state, data), state.otherGames.trim()].filter(Boolean)
  const look = [
    state.caseColor ? `obudowa ${lower(labelOf(CASE_COLOR_CHOICES, state.caseColor))}` : null,
    state.lighting ? `podświetlenie ${lower(labelOf(LIGHTING_CHOICES, state.lighting))}` : null,
  ].filter(Boolean)
  const contact = [state.name.trim(), state.email.trim(), state.phone.trim()].filter(Boolean)
  const company = state.invoice === 'company' && state.nip.trim()
  const rows: ReviewRow[] = [
    { label: 'Komputer', value: computerText(state, data), step: 0 },
    { label: 'Gry', value: games.join(', ') || NONE, step: 1 },
    { label: 'Monitor', value: monitorText(state), step: 1 },
    { label: 'Wygląd', value: look.join(', ') || NONE, step: 1 },
    {
      label: 'Dodatki',
      value: state.extras.map((e) => labelOf(EXTRA_CHOICES, e)).join(', ') || 'bez dodatków',
      step: 1,
    },
    {
      label: 'Kontakt',
      value: `${contact.join(', ')}, odpowiedź: ${lower(labelOf(PREFERRED_CONTACT_CHOICES, state.preferredContact))}`,
      step: 2,
    },
    {
      label: 'Odbiór i faktura',
      value:
        `${labelOf(PICKUP_CHOICES, state.pickup)}, ${lower(labelOf(INVOICE_CHOICES, state.invoice))}` +
        (company ? `, NIP ${state.nip.trim()}` : ''),
      step: 2,
    },
  ]
  if (state.message.trim()) rows.push({ label: 'Uwagi', value: state.message.trim(), step: 2 })
  return rows
}

/** „Twoja konfiguracja” on `/zapytanie/wyslane` — public labels only (ADR-G002 §8.7). */
export type SentSummary = { key: string | null; title: string; sub: string; rows: Row[] }

export function sentSummaryOf(state: FormState, data: FormData): SentSummary {
  const summary = summaryOf(state, data)
  const recipe = recipeOf(state, data)
  // „Wysyłka w cenie” is one of the promises under every price (`components/promises.ts`).
  const pickupText = lower(labelOf(PICKUP_CHOICES, state.pickup))
  const pickup: Row = {
    label: 'Odbiór',
    value: state.pickup === 'courier' ? `${pickupText}, w cenie` : pickupText,
  }
  if (!recipe) {
    return { key: null, title: summary.title, sub: summary.sub, rows: [...summary.rows] }
  }
  const level = data.levels[recipe.level]
  const { option } = data.labels
  const rows: Row[] = [
    { label: 'Procesor', value: level?.cpu ?? '' },
    { label: 'Karta', value: level?.gpu ?? '' },
    { label: 'Pamięć', value: option[recipe.ram] ?? '' },
    { label: 'Dysk', value: option[recipe.ssd] ?? '' },
  ].filter((row) => row.value)
  const sub = [
    level?.power,
    option[recipe.case] ? `obudowa ${option[recipe.case]}` : null,
    lightText(state),
  ]
    .filter(Boolean)
    .join(', ')
  return { key: summary.key, title: summary.title, sub, rows: [...rows, pickup] }
}

// ---------------------------------------------------------------------------------------------
// The body for POST /api/inquiry
// ---------------------------------------------------------------------------------------------

/** Request body (ADR-G005); the server validates it again and ignores anything extra. */
export function toPayload(
  state: FormState,
  context: { url: string; token: string; honeypot: string },
): Record<string, unknown> {
  const type = inquiryType(state)
  const computer = computerRequest(state)
  const url = new URL(context.url)
  const utm = (key: string) => url.searchParams.get(key) ?? undefined
  return {
    type,
    ...computer,
    lightColor: computer && state.light ? state.light : undefined,
    forWhom: type === 'advice' ? (state.forWhom ?? undefined) : undefined,
    budget: type === 'advice' ? (state.budget ?? undefined) : undefined,
    customList: type === 'custom_list' ? state.customList.trim() : undefined,
    games: state.games,
    otherGames: state.otherGames.trim(),
    monitor: state.monitor ?? undefined,
    refresh: state.refresh ?? undefined,
    caseColor: state.caseColor ?? undefined,
    lighting: state.lighting ?? undefined,
    extras: state.extras,
    name: state.name.trim(),
    email: state.email.trim(),
    phone: state.phone.trim(),
    preferredContact: state.preferredContact,
    pickup: state.pickup,
    invoice: state.invoice,
    nip: state.invoice === 'company' ? state.nip.trim() : undefined,
    message: state.message.trim(),
    consent: { accepted: state.consent, clauseVersion: CONSENT_CLAUSE.version },
    marketingConsent: state.marketingConsent,
    source: {
      url: context.url,
      utmSource: utm('utm_source'),
      utmMedium: utm('utm_medium'),
      utmCampaign: utm('utm_campaign'),
    },
    [FORM_TOKEN_FIELD]: context.token,
    [HONEYPOT_FIELD]: context.honeypot,
  }
}

/** Inquiry numbers the „wysłane” page accepts in its address (`PKG-2026-0001`). */
export const INQUIRY_NUMBER = /^PKG-\d{4}-\d{4,}$/
