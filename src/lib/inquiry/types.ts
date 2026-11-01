/**
 * Vocabulary of an inquiry (ADR-G005): stored values in English, labels 1:1 from the Formularz
 * board. One list per field, shared by the collection, the Zod schema and the e-mails, so a value
 * cannot exist in one place and not in another.
 */

type Choice<V extends string> = { readonly value: V; readonly label: string }

const values = <V extends string>(choices: readonly { readonly value: V }[]) =>
  choices.map((choice) => choice.value) as [V, ...V[]]

/** Label of a stored value; the value itself when unknown (old record after a change). */
export function labelOf<V extends string>(choices: readonly Choice<V>[], value: V): string {
  return choices.find((choice) => choice.value === value)?.label ?? value
}

export const INQUIRY_TYPE_CHOICES = [
  { value: 'build', label: 'Gotowy zestaw' },
  { value: 'config', label: 'Konfiguracja' },
  { value: 'advice', label: 'Pomóżcie mi dobrać' },
  { value: 'custom_list', label: 'Mam własną listę' },
  { value: 'compare', label: 'Z porównania' },
  { value: 'contact', label: 'Krótkie pytanie' },
  { value: 'voucher', label: 'Bon podarunkowy' },
  { value: 'ready', label: 'Gotowe od ręki' },
] as const satisfies readonly Choice<string>[]
export const INQUIRY_TYPES = values(INQUIRY_TYPE_CHOICES)
export type InquiryType = (typeof INQUIRY_TYPES)[number]

/** Types `POST /api/inquiry` accepts — all of them since G13 (`voucher`, `ready`). */
export const ACCEPTED_TYPES = [
  'build',
  'config',
  'advice',
  'custom_list',
  'compare',
  'contact',
  'voucher',
  'ready',
] as const satisfies readonly InquiryType[]

/** Types that carry a priced configuration (server recomputes price and compatibility). */
export const CONFIG_TYPES = ['build', 'config', 'compare'] as const satisfies readonly InquiryType[]

export const INQUIRY_STATUS_CHOICES = [
  { value: 'new', label: 'Nowe' },
  { value: 'in_progress', label: 'W toku' },
  { value: 'offer_sent', label: 'Oferta wysłana' },
  { value: 'won', label: 'Zamówione' },
  { value: 'lost', label: 'Bez zamówienia' },
  { value: 'closed', label: 'Zamknięte' },
] as const satisfies readonly Choice<string>[]
export const INQUIRY_STATUSES = values(INQUIRY_STATUS_CHOICES)
export type InquiryStatus = (typeof INQUIRY_STATUSES)[number]

/** Statuses the retention job may delete (Krystian 27.10.2026): finished without an order. */
export const RETAINED_UNTIL_EXPIRY = ['lost', 'closed'] as const satisfies readonly InquiryStatus[]

export const FOR_WHOM_CHOICES = [
  { value: 'self', label: 'Dla siebie' },
  { value: 'child', label: 'Dla dziecka' },
  { value: 'gift', label: 'Na prezent' },
] as const satisfies readonly Choice<string>[]

export const BUDGET_CHOICES = [
  { value: 'upto_6k', label: 'do 6 000 zł' },
  { value: '6k_9k', label: '6–9 tys. zł' },
  { value: '9k_14k', label: '9–14 tys. zł' },
  { value: 'over_14k', label: 'powyżej 14 tys. zł' },
  { value: 'unsure', label: 'Nie wiem, doradźcie' },
] as const satisfies readonly Choice<string>[]

export const MONITOR_CHOICES = [
  { value: 'fullhd', label: 'FullHD' },
  { value: 'qhd', label: '2K' },
  { value: 'uhd', label: '4K' },
  { value: 'unsure', label: 'Nie wiem' },
] as const satisfies readonly Choice<string>[]

export const REFRESH_CHOICES = [
  { value: '60', label: '60 Hz' },
  { value: '144', label: '144 Hz' },
  { value: '240', label: '240 Hz' },
  { value: 'unsure', label: 'Nie wiem' },
] as const satisfies readonly Choice<string>[]

export const CASE_COLOR_CHOICES = [
  { value: 'black', label: 'Czarna' },
  { value: 'white', label: 'Biała' },
  { value: 'any', label: 'Obojętnie' },
] as const satisfies readonly Choice<string>[]

export const LIGHTING_CHOICES = [
  { value: 'colorful', label: 'Kolorowe' },
  { value: 'subtle', label: 'Stonowane' },
  { value: 'none', label: 'Bez podświetlenia' },
] as const satisfies readonly Choice<string>[]

/**
 * Light colour picked on the build page („Dopasuj”) or in the configurator (spec. §7). Empty = the
 * creature's own light. Labels 1:1 from the board `LIGHTS`; `lib/buildPage.ts` reads this list.
 */
export const LIGHT_COLOR_CHOICES = [
  { value: 'piorun', label: 'Piorun' },
  { value: 'krew', label: 'Krew' },
  { value: 'las', label: 'Las' },
  { value: 'czary', label: 'Czary' },
  { value: 'lod', label: 'Lód' },
  { value: 'ogien', label: 'Ogień' },
] as const satisfies readonly Choice<string>[]
export type LightColor = (typeof LIGHT_COLOR_CHOICES)[number]['value']

/** One of the six light colours (an address or a stored value may hold anything). */
export const isLight = (value: unknown): value is LightColor =>
  LIGHT_COLOR_CHOICES.some((c) => c.value === value)

export const EXTRA_CHOICES = [
  { value: 'monitor', label: 'Monitor' },
  { value: 'mouse_keyboard', label: 'Mysz i klawiatura' },
  { value: 'headphones', label: 'Słuchawki' },
  { value: 'office', label: 'Pakiet Office' },
  { value: 'extra_drive', label: 'Dodatkowy dysk' },
] as const satisfies readonly Choice<string>[]

export const PICKUP_CHOICES = [
  { value: 'courier', label: 'Kurier' },
  { value: 'rabka', label: 'Sklep w Rabce-Zdroju' },
] as const satisfies readonly Choice<string>[]

export const INVOICE_CHOICES = [
  { value: 'private', label: 'Na osobę prywatną' },
  { value: 'company', label: 'Na firmę' },
] as const satisfies readonly Choice<string>[]

export const PREFERRED_CONTACT_CHOICES = [
  { value: 'email', label: 'E-mail' },
  { value: 'phone', label: 'Telefon' },
] as const satisfies readonly Choice<string>[]

/**
 * Gift voucher (spec. §12, board Bon): amounts with the board's notes and four looks.
 * TODO(krystian): amounts and the 12-month validity — the boss's decision before the page is
 * switched on (FEATURE_VOUCHER).
 */
export const VOUCHER_AMOUNTS = [
  { amount: 500, note: 'na akcesoria' },
  { amount: 1000, note: 'najczęściej' },
  { amount: 2000, note: 'spora część' },
  { amount: 3000, note: 'pół komputera' },
] as const
export type VoucherAmount = (typeof VOUCHER_AMOUNTS)[number]['amount']
export const VOUCHER_VALID_MONTHS = 12

export const VOUCHER_DESIGN_CHOICES = [
  { value: 'perun', label: 'Perun' },
  { value: 'wampir', label: 'Wampir' },
  { value: 'rusalka', label: 'Rusałka' },
  { value: 'skrzat', label: 'Skrzat' },
] as const satisfies readonly Choice<string>[]
export type VoucherDesign = (typeof VOUCHER_DESIGN_CHOICES)[number]['value']

export const CHOICES = {
  forWhom: FOR_WHOM_CHOICES,
  budget: BUDGET_CHOICES,
  monitor: MONITOR_CHOICES,
  refresh: REFRESH_CHOICES,
  caseColor: CASE_COLOR_CHOICES,
  lighting: LIGHTING_CHOICES,
  lightColor: LIGHT_COLOR_CHOICES,
  extras: EXTRA_CHOICES,
  pickup: PICKUP_CHOICES,
  invoice: INVOICE_CHOICES,
  preferredContact: PREFERRED_CONTACT_CHOICES,
  voucherDesign: VOUCHER_DESIGN_CHOICES,
} as const

export const choiceValues = values
