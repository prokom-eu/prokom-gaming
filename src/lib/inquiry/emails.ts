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
  type InquiryType,
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
    `Cena: ${zl(computer.price)} brutto (cena z dnia ${dateFormat.format(new Date(computer.publishedAt))})`,
  ]
}

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

/**
 * Confirmation for the customer: number, computer and price, when we answer. It does not repeat
 * the message or the contact details: anyone can type someone else's address into a form, so the
 * mail must not carry what a person wrote to a stranger. Replies go to the Gaming inbox.
 */
// TODO(G12): final wording from the „Co będzie dalej” board (spec. §10).
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
        ? ['', 'Twoja konfiguracja:', ...computerLines(inquiry.computer, false, inquiry.lightColor)]
        : []),
      '',
      'Oferta z imienną listą części, ceną i terminem przyjdzie w odpowiedzi na ten e-mail.',
      'Jeśli to nie Ty wysłałeś(-aś) ten formularz, zignoruj tę wiadomość.',
      '',
      'Pozdrawiamy',
      'PRO-KOM Gaming',
    ].join('\n'),
  }
}
