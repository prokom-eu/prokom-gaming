import { DEFAULT_SITE_URL, mailFooter, originOf, phoneButton } from '../mail/brand'
import {
  buildAccent,
  renderMail,
  type KeyValue,
  type MailBlock,
  type RenderedMail,
} from '../mail/layout'
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

export type Email = {
  to: string
  replyTo?: string
  subject: string
  text: string
  /** Our own id (thread of the inquiry, ADR-G008); the adapter passes it to nodemailer. */
  messageId?: string
  /** The branded version (`lib/mail/layout`); `text` stays for programs without HTML. */
  html?: string
  attachments?: RenderedMail['attachments']
}

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

function computerLines(computer: ComputerForEmail, withCodes: boolean): string[] {
  return [
    ...(computer.buildName ? [`Zestaw: ${computer.buildName}`] : []),
    ...PART_KEYS.map((key) => {
      const code = computer.config[key]
      const label = computer.labels[key] ?? code
      return `- ${PART_LABELS[key]}: ${label}${withCodes && label !== code ? ` (${code})` : ''}`
    }),
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

const kv = (label: string, value: string | null | undefined, extra?: Partial<KeyValue>) =>
  value ? [{ label, value, ...extra }] : []

/** The computer as rows of a card; codes only for the team (never `internalModel`). */
function computerRows(computer: ComputerForEmail, withCodes: boolean): KeyValue[] {
  return [
    ...PART_KEYS.flatMap((key) => {
      const code = computer.config[key]
      const name = computer.labels[key]
      // The customer never sees a bare code: no public name, no row.
      if (!name && !withCodes) return []
      const label = name ?? code
      return [
        {
          label: PART_LABELS[key],
          value: withCodes && label !== code ? `${label} (${code})` : label,
        },
      ]
    }),
  ]
}

function computerPrice(computer: ComputerForEmail, withCodes: boolean) {
  const date = dateFormat.format(new Date(computer.publishedAt))
  return computer.unit
    ? {
        label: 'Cena za ten egzemplarz, brutto',
        value: zl(computer.price),
        note:
          withCodes && computer.unit.discount > 0
            ? `rabat egzemplarza ${zl(computer.unit.discount)} · ceny z dnia ${date}`
            : undefined,
      }
    : { label: 'Cena brutto', value: zl(computer.price), note: `cena z dnia ${date}` }
}

function computerCard(
  inquiry: InquiryForEmail,
  computer: ComputerForEmail,
  withCodes: boolean,
): MailBlock {
  return {
    kind: 'card',
    eyebrow: inquiry.stock
      ? 'Zarezerwowany egzemplarz'
      : computer.buildName
        ? 'Zestaw z oferty'
        : 'Twoja konfiguracja',
    title: computer.buildName ?? 'Konfiguracja z konfiguratora',
    accent: buildAccent(computer.buildName),
    subtitle: computer.labels.level,
    rows: computerRows(computer, withCodes),
    price: computerPrice(computer, withCodes),
  }
}

const mailtoReply = (inquiry: InquiryForEmail) =>
  `mailto:${inquiry.email}?subject=${encodeURIComponent(`Re: [${inquiry.number}] PRO-KOM Gaming`)}`
const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, '')}`

/** The notification as the board's dark-tag mail: everything in the record, in sections. */
function notificationHtml(inquiry: InquiryForEmail, panelUrl: string): RenderedMail {
  const siteUrl = originOf(panelUrl)
  const sentAt = dateTimeFormat.format(new Date(inquiry.consent.acceptedAt))
  const blocks: MailBlock[] = [
    {
      kind: 'person',
      eyebrow: 'Klient',
      name: inquiry.name,
      items: [
        { label: 'E-mail', value: inquiry.email, href: `mailto:${inquiry.email}` },
        ...kv('Telefon', inquiry.phone, inquiry.phone ? { href: telHref(inquiry.phone) } : {}),
        ...kv('Woli odpowiedź', optional(PREFERRED_CONTACT_CHOICES, inquiry.preferredContact)),
        ...kv('Odbiór', optional(PICKUP_CHOICES, inquiry.pickup)),
        ...kv('Faktura', optional(INVOICE_CHOICES, inquiry.invoice)),
        ...kv('NIP', inquiry.nip),
      ],
      aside: inquiry.computer
        ? { label: 'Wartość', value: zl(inquiry.computer.price), note: 'brutto' }
        : inquiry.voucher
          ? { label: 'Bon', value: zl(inquiry.voucher.amount) }
          : undefined,
    },
    {
      kind: 'buttons',
      buttons: [
        { label: 'Otwórz w panelu', href: panelUrl, primary: true },
        { label: 'Odpowiedz klientowi', href: mailtoReply(inquiry) },
        ...(inquiry.phone ? [{ label: 'Zadzwoń', href: telHref(inquiry.phone) }] : []),
      ],
    },
    ...(inquiry.computer ? [computerCard(inquiry, inquiry.computer, true)] : []),
    ...(inquiry.stock
      ? [
          {
            kind: 'section' as const,
            title: 'Egzemplarz',
            rows: [
              { label: 'Numer', value: `#${inquiry.stock.id}` },
              { label: 'Gdzie', value: inquiry.stock.location },
              ...kv('Stan', inquiry.stock.conditionNote),
              {
                label: 'Zarezerwowany do',
                value: dateTimeFormat.format(new Date(inquiry.stock.reservedUntil)),
                strong: true,
              },
            ],
          },
        ]
      : []),
    ...(inquiry.voucher
      ? [
          {
            kind: 'section' as const,
            title: 'Bon podarunkowy',
            rows: [
              { label: 'Kwota', value: zl(inquiry.voucher.amount), strong: true },
              { label: 'Wygląd', value: labelOf(VOUCHER_DESIGN_CHOICES, inquiry.voucher.design) },
              ...kv('Dla kogo (na bonie)', inquiry.voucher.recipient),
              ...kv('Dedykacja', inquiry.voucher.dedication),
            ],
          },
        ]
      : []),
    {
      kind: 'section',
      title: 'Do czego i jak',
      rows: [
        ...kv('Dla kogo', optional(FOR_WHOM_CHOICES, inquiry.forWhom)),
        ...kv('Budżet', optional(BUDGET_CHOICES, inquiry.budget)),
        ...kv('Gry', inquiry.games.join(', ')),
        ...kv('Inne gry albo programy', inquiry.otherGames),
        ...kv('Monitor', monitorText(inquiry)),
        ...kv('Kolor obudowy', optional(CASE_COLOR_CHOICES, inquiry.caseColor)),
        ...kv('Podświetlenie', optional(LIGHTING_CHOICES, inquiry.lighting)),
        ...kv('Potrzebuje też', inquiry.extras.map((e) => labelOf(EXTRA_CHOICES, e)).join(', ')),
      ],
    },
    ...(inquiry.customList
      ? [{ kind: 'quote' as const, title: 'Własna lista części', text: inquiry.customList }]
      : []),
    ...(inquiry.message
      ? [{ kind: 'quote' as const, title: 'Uwagi klienta', text: inquiry.message }]
      : []),
    {
      kind: 'section',
      title: 'Skąd i zgody',
      rows: [
        { label: 'Strona', value: inquiry.source.url, href: inquiry.source.url },
        ...kv('utm_source', inquiry.source.utmSource),
        ...kv('utm_medium', inquiry.source.utmMedium),
        ...kv('utm_campaign', inquiry.source.utmCampaign),
        { label: 'Zgoda RODO', value: `wersja ${inquiry.consent.clauseVersion}, ${sentAt}` },
        { label: 'Zgoda marketingowa', value: inquiry.marketingConsent ? 'tak' : 'nie' },
      ],
    },
  ]
  return renderMail({
    preheader: [
      inquiry.name,
      inquiry.computer?.buildName,
      inquiry.computer ? zl(inquiry.computer.price) : null,
    ]
      .filter(Boolean)
      .join(' · '),
    tagLabel: `Zapytanie ${inquiry.number}`,
    status: `Wysłane ${sentAt}`,
    title: `Nowe zapytanie: ${typeLabel(inquiry.type).toLowerCase()}`,
    lead: '„Odpowiedz” w programie pocztowym trafi prosto do klienta.',
    blocks,
    footer: mailFooter(
      siteUrl,
      'Powiadomienie wewnętrzne PRO-KOM Gaming — zawiera dane klienta, nie przekazuj dalej.',
    ),
  })
}

/** The confirmation as board A: what was sent, what happens next, how to reach us. */
function confirmationHtml(
  inquiry: InquiryForEmail,
  responseTime: string | null,
  siteUrl: string,
): RenderedMail {
  const sentAt = dateTimeFormat.format(new Date(inquiry.consent.acceptedAt))
  const steps = nextSteps(inquiry.type).map(([title, text]) => ({ title, text }))
  const blocks: MailBlock[] = [
    ...(inquiry.computer ? [computerCard(inquiry, inquiry.computer, false)] : []),
    ...(inquiry.stock
      ? [
          {
            kind: 'section' as const,
            title: 'Rezerwacja',
            rows: [
              {
                label: 'Egzemplarz czeka na Ciebie do',
                value: dateTimeFormat.format(new Date(inquiry.stock.reservedUntil)),
                strong: true,
              },
            ],
          },
        ]
      : []),
    // Amount and look only: the recipient and the dedication are what a person typed (see below).
    ...(inquiry.voucher
      ? [
          {
            kind: 'card' as const,
            eyebrow: 'Bon podarunkowy',
            title: zl(inquiry.voucher.amount),
            subtitle: `Wygląd: ${labelOf(VOUCHER_DESIGN_CHOICES, inquiry.voucher.design)}`,
          },
        ]
      : []),
    { kind: 'steps', title: 'Co dalej', steps },
    {
      kind: 'callout',
      title: 'Chcesz coś zmienić albo dopytać?',
      text: 'Odpowiedz na tego maila — trafi prosto do nas.',
      button: phoneButton,
    },
  ]
  return renderMail({
    preheader: `Sprawdzamy części i ceny — wrócimy z ofertą${responseTime ? ` ${responseTime}` : ''}.`,
    tagLabel: `Zapytanie ${inquiry.number}`,
    status: `Wysłane ${sentAt}`,
    title: 'Mamy Twoje zapytanie.',
    lead:
      'Dziękujemy. Sprawdzamy dostępność części i ceny u dostawców — wrócimy z ofertą na piśmie, z listą podzespołów i terminem.' +
      (responseTime ? ` Odpiszemy ${responseTime}.` : ''),
    blocks,
    footer: mailFooter(
      siteUrl,
      'Wiadomość wysłana automatycznie po wysłaniu formularza. Bez newslettera. Jeśli to nie Ty wysłałeś(-aś) formularz, zignoruj tę wiadomość.',
    ),
  })
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
    ...(inquiry.computer ? computerLines(inquiry.computer, true) : []),
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

  const { html, attachments } = notificationHtml(inquiry, panelUrl)
  return { to, replyTo: inquiry.email, subject, text, html, attachments }
}

/** „Co będzie dalej” — the same four steps as `/zapytanie/wyslane` (board Zapytanie). */
export const NEXT_STEPS = [
  ['Teraz', 'Zapytanie jest u nas. Kopia poszła na Twój e-mail.'],
  ['W ciągu godziny', 'Krystian odpisze z imienną listą części, ceną i terminem. Codziennie 9–22.'],
  ['Gdy zaakceptujesz', 'Wystawimy fakturę pro forma. Płacisz przelewem albo BLIK-iem.'],
  ['5–10 dni roboczych', 'Montaż, test obciążeniowy, pomiary w grach, metryka i wysyłka.'],
] as const

// TODO(krystian): the steps of a voucher and of a reserved unit (not on the boards; working text
// from the Bon and Gotowe boards: PDF after payment, shipping in 1–2 working days).
const VOUCHER_STEPS = [
  ['Teraz', 'Zamówienie bonu jest u nas. Kopia poszła na Twój e-mail.'],
  ['W ciągu godziny', 'Odpiszemy z fakturą pro forma. Codziennie 9–22.'],
  ['Gdy zapłacisz', 'Bon jako PDF do druku przyjdzie na e-mail albo czeka w kopercie w sklepie.'],
] as const
const READY_STEPS = [
  ['Teraz', 'Egzemplarz jest zarezerwowany dla Ciebie na 24 godziny.'],
  ['W ciągu godziny', 'Odpiszemy z fakturą pro forma i terminem odbioru. Codziennie 9–22.'],
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
  {
    responseTime,
    replyTo,
    siteUrl = DEFAULT_SITE_URL,
  }: { responseTime: string | null; replyTo: string | null; siteUrl?: string },
): Email {
  const { html, attachments } = confirmationHtml(inquiry, responseTime, siteUrl)
  return {
    html,
    attachments,
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
            ...computerLines(inquiry.computer, false),
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
