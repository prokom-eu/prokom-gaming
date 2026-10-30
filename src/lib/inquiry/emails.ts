import { zl } from '../pricing/format'
import type { Config } from '../pricing/types'
import {
  BUDGET_CHOICES,
  CASE_COLOR_CHOICES,
  EXTRA_CHOICES,
  FOR_WHOM_CHOICES,
  INQUIRY_TYPE_CHOICES,
  INVOICE_CHOICES,
  labelOf,
  LIGHT_COLOR_CHOICES,
  LIGHTING_CHOICES,
  MONITOR_CHOICES,
  PICKUP_CHOICES,
  PREFERRED_CONTACT_CHOICES,
  REFRESH_CHOICES,
  VOUCHER_DESIGN_CHOICES,
  type InquiryType,
  type VoucherDesign,
} from './types'

type Choice<T extends readonly { value: string }[]> = T[number]['value']

/** The priced computer as e-mails show it: public names only (never `internalModel`). */
export type ComputerForEmail = {
  buildName: string | null
  config: Config
  /** Public name per code (`publicLabel`); the code stays visible for the team. */
  labels: Partial<Record<keyof Config, string>>
  price: number
  /** When the prices were published: „cena z dnia …” (ADR-G002 §2). */
  publishedAt: string
  /** A „Gotowe od ręki” unit: `price` is its own price (configuration minus `discount`). */
  unit?: { discount: number }
}

/** The reserved unit (type `ready`), as the team needs it. */
export type StockForEmail = {
  id: number
  location: string
  conditionNote: string
  reservedUntil: string
}

/** What the e-mails need from a saved inquiry. */
export type InquiryForEmail = {
  number: string
  type: InquiryType
  computer: ComputerForEmail | null
  /** Empty = the creature's own light. */
  lightColor?: Choice<typeof LIGHT_COLOR_CHOICES>
  forWhom?: Choice<typeof FOR_WHOM_CHOICES>
  budget?: Choice<typeof BUDGET_CHOICES>
  customList?: string
  /** Game names from the database (unknown slugs already dropped). */
  games: string[]
  otherGames?: string
  monitor?: Choice<typeof MONITOR_CHOICES>
  refresh?: Choice<typeof REFRESH_CHOICES>
  caseColor?: Choice<typeof CASE_COLOR_CHOICES>
  lighting?: Choice<typeof LIGHTING_CHOICES>
  extras: Choice<typeof EXTRA_CHOICES>[]
  name: string
  email: string
  phone?: string
  preferredContact?: Choice<typeof PREFERRED_CONTACT_CHOICES>
  pickup?: Choice<typeof PICKUP_CHOICES>
  invoice?: Choice<typeof INVOICE_CHOICES>
  nip?: string
  message?: string
  source: { url: string; utmSource?: string; utmMedium?: string; utmCampaign?: string }
  consent: { clauseVersion: string; acceptedAt: string }
  marketingConsent: boolean
  voucher?: { amount: number; design: VoucherDesign; recipient?: string; dedication?: string }
  stock?: StockForEmail | null
}

export type Email = { to: string; replyTo?: string; subject: string; text: string }

const PART_LABELS: Record<keyof Config, string> = {
  level: 'Poziom mocy',
  case: 'Obudowa',
  cooler: 'Chłodzenie',
  ram: 'Pamięć',
  ssd: 'Dysk',
}
const PART_KEYS = Object.keys(PART_LABELS) as (keyof Config)[]

const dateFormat = new Intl.DateTimeFormat('pl-PL', {
  timeZone: 'Europe/Warsaw',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})
const dateTimeFormat = new Intl.DateTimeFormat('pl-PL', {
  timeZone: 'Europe/Warsaw',
  dateStyle: 'short',
  timeStyle: 'short',
})

// Header values come partly from the form: one line, no CR/LF.
function oneLine(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function rows(pairs: [string, string | null | undefined][]): string[] {
  return pairs
    .filter((pair): pair is [string, string] => Boolean(pair[1]))
    .map(([label, value]) => `${label}: ${value}`)
}

const typeLabel = (type: InquiryType) => labelOf(INQUIRY_TYPE_CHOICES, type)

const optional = <V extends string>(
  choices: readonly { value: V; label: string }[],
  value: V | undefined,
) => (value === undefined ? undefined : labelOf(choices, value))

function computerLines(
  computer: ComputerForEmail,
  withCodes: boolean,
  lightColor: InquiryForEmail['lightColor'],
): string[] {
  return [
    ...(computer.buildName ? [`Zestaw: ${computer.buildName}`] : []),
    ...PART_KEYS.map((key) => {
      const code = computer.config[key]
      const label = computer.labels[key] ?? code
      return `- ${PART_LABELS[key]}: ${label}${withCodes && label !== code ? ` (${code})` : ''}`
    }),
    ...(lightColor ? [`- Światło: ${labelOf(LIGHT_COLOR_CHOICES, lightColor)}`] : []),
    computer.unit
      ? `Cena za ten egzemplarz: ${zl(computer.price)} brutto` +
        (withCodes && computer.unit.discount > 0
          ? ` (rabat egzemplarza ${zl(computer.unit.discount)}, ceny z dnia ${dateFormat.format(new Date(computer.publishedAt))})`
          : '')
      : `Cena: ${zl(computer.price)} brutto (cena z dnia ${dateFormat.format(new Date(computer.publishedAt))})`,
  ]
}

const voucherText = (voucher: NonNullable<InquiryForEmail['voucher']>) =>
  `${zl(voucher.amount)}, wygląd ${labelOf(VOUCHER_DESIGN_CHOICES, voucher.design)}`

function monitorText(inquiry: InquiryForEmail): string | undefined {
  const parts = [
    optional(MONITOR_CHOICES, inquiry.monitor),
    optional(REFRESH_CHOICES, inquiry.refresh),
  ].filter(Boolean)
  return parts.length > 0 ? parts.join(', ') : undefined
}

/**
 * Notification for the Gaming inbox (ADR-G005): plain text, made for answering straight from the
 * mail program — Reply-To is the customer, the number and type are in the subject, every field is
 * in the body and the record is one click away.
 */
export function notificationEmail(
  inquiry: InquiryForEmail,
  { to, panelUrl }: { to: string; panelUrl: string },
): Email {
  const subject = [
    `Zapytanie ${inquiry.number}`,
    typeLabel(inquiry.type),
    inquiry.computer?.buildName,
  ]
    .filter((part): part is string => Boolean(part))
    .map(oneLine)
    .join(' — ')

  const text = [
    `Nowe zapytanie ${inquiry.number} ze strony PRO-KOM Gaming.`,
    '',
    `Rodzaj: ${typeLabel(inquiry.type)}`,
    ...(inquiry.computer ? computerLines(inquiry.computer, true, inquiry.lightColor) : []),
    ...(inquiry.stock
      ? rows([
          ['Egzemplarz', `#${inquiry.stock.id}, ${inquiry.stock.location}`],
          ['Stan', inquiry.stock.conditionNote],
          ['Zarezerwowany do', dateTimeFormat.format(new Date(inquiry.stock.reservedUntil))],
        ])
      : []),
    ...(inquiry.voucher
      ? rows([
          ['Bon', voucherText(inquiry.voucher)],
          ['Dla kogo (na bonie)', inquiry.voucher.recipient],
          ['Dedykacja', inquiry.voucher.dedication],
        ])
      : []),
    ...rows([
      ['Dla kogo', optional(FOR_WHOM_CHOICES, inquiry.forWhom)],
      ['Budżet', optional(BUDGET_CHOICES, inquiry.budget)],
    ]),
    ...(inquiry.customList ? ['', 'Własna lista:', inquiry.customList] : []),
    '',
    ...rows([
      ['Gry', inquiry.games.join(', ')],
      ['Inne gry albo programy', inquiry.otherGames],
      ['Monitor', monitorText(inquiry)],
      ['Obudowa', optional(CASE_COLOR_CHOICES, inquiry.caseColor)],
      ['Podświetlenie', optional(LIGHTING_CHOICES, inquiry.lighting)],
      ['Potrzebujesz też', inquiry.extras.map((e) => labelOf(EXTRA_CHOICES, e)).join(', ')],
    ]),
    '',
    ...rows([
      ['Imię', inquiry.name],
      ['E-mail', inquiry.email],
      ['Telefon', inquiry.phone],
      ['Odpowiedź', optional(PREFERRED_CONTACT_CHOICES, inquiry.preferredContact)],
      ['Odbiór', optional(PICKUP_CHOICES, inquiry.pickup)],
      ['Faktura', optional(INVOICE_CHOICES, inquiry.invoice)],
      ['NIP', inquiry.nip],
    ]),
    ...(inquiry.message ? ['', 'Uwagi:', inquiry.message] : []),
    '',
    ...rows([
      ['Strona', inquiry.source.url],
      ['utm_source', inquiry.source.utmSource],
      ['utm_medium', inquiry.source.utmMedium],
      ['utm_campaign', inquiry.source.utmCampaign],
      [
        'Zgoda RODO',
        `wersja ${inquiry.consent.clauseVersion}, ${dateTimeFormat.format(new Date(inquiry.consent.acceptedAt))}`,
      ],
      ['Zgoda marketingowa', inquiry.marketingConsent ? 'tak' : 'nie'],
    ]),
    '',
    `Zapytanie w panelu: ${panelUrl}`,
  ].join('\n')

  return { to, replyTo: inquiry.email, subject, text }
}

/** „Co będzie dalej” — the same four steps as `/zapytanie/wyslane` (board Zapytanie). */
export const NEXT_STEPS = [
  ['Teraz', 'Zapytanie jest u nas. Kopia poszła na Twój e-mail.'],
  ['W ciągu godziny', 'Krystian odpisze z imienną listą części, ceną i terminem. Codziennie 8–22.'],
  ['Gdy zaakceptujesz', 'Wystawimy fakturę pro forma. Płacisz przelewem albo BLIK-iem.'],
  ['5–10 dni roboczych', 'Montaż, test obciążeniowy, pomiary w grach, metryka i wysyłka.'],
] as const

// TODO(krystian): the steps of a voucher and of a reserved unit (not on the boards; working text
// from the Bon and Gotowe boards: PDF after payment, shipping in 1–2 working days).
const VOUCHER_STEPS = [
  ['Teraz', 'Zamówienie bonu jest u nas. Kopia poszła na Twój e-mail.'],
  ['W ciągu godziny', 'Odpiszemy z fakturą pro forma. Codziennie 8–22.'],
  ['Gdy zapłacisz', 'Bon jako PDF do druku przyjdzie na e-mail albo czeka w kopercie w sklepie.'],
] as const
const READY_STEPS = [
  ['Teraz', 'Egzemplarz jest zarezerwowany dla Ciebie na 24 godziny.'],
  ['W ciągu godziny', 'Odpiszemy z fakturą pro forma i terminem odbioru. Codziennie 8–22.'],
  ['Gdy zapłacisz', 'Wysyłka w 1–2 dni robocze albo odbiór w sklepie od ręki.'],
] as const

export function nextSteps(type: InquiryType): readonly (readonly [string, string])[] {
  if (type === 'voucher') return VOUCHER_STEPS
  if (type === 'ready') return READY_STEPS
  return NEXT_STEPS
}

/**
 * Confirmation for the customer: number, computer and price, what comes next (spec. §10: the
 * board's „Co będzie dalej”). It does not repeat the message or the contact details: anyone can
 * type someone else's address into a form, so the mail must not carry what a person wrote to a
 * stranger. Replies go to the Gaming inbox.
 */
export function confirmationEmail(
  inquiry: InquiryForEmail,
  { responseTime, replyTo }: { responseTime: string | null; replyTo: string | null },
): Email {
  return {
    to: inquiry.email,
    ...(replyTo ? { replyTo } : {}),
    subject: oneLine(`Otrzymaliśmy Twoje zapytanie ${inquiry.number} — PRO-KOM Gaming`),
    text: [
      'Dzień dobry,',
      '',
      `dziękujemy za zapytanie ${inquiry.number}.` +
        (responseTime ? ` Odpiszemy ${responseTime}.` : ' Odpiszemy najszybciej, jak się da.'),
      ...(inquiry.computer
        ? [
            '',
            inquiry.stock ? 'Zarezerwowany egzemplarz:' : 'Twoja konfiguracja:',
            ...computerLines(inquiry.computer, false, inquiry.lightColor),
          ]
        : []),
      ...(inquiry.stock
        ? [`Rezerwacja do: ${dateTimeFormat.format(new Date(inquiry.stock.reservedUntil))}`]
        : []),
      // Amount and look only: the recipient and the dedication are what a person typed (see above).
      ...(inquiry.voucher ? ['', `Bon podarunkowy: ${voucherText(inquiry.voucher)}`] : []),
      '',
      'Co będzie dalej:',
      ...nextSteps(inquiry.type).map(([title, text], i) => `${i + 1}. ${title}: ${text}`),
      '',
      'Coś się nie zgadza? Odpowiedz na tę wiadomość.',
      'Jeśli to nie Ty wysłałeś(-aś) ten formularz, zignoruj tę wiadomość.',
      '',
      'Pozdrawiamy',
      'PRO-KOM Gaming',
    ].join('\n'),
  }
}
