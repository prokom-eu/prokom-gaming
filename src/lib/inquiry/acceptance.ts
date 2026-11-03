import { mailFooter, phoneButton } from '../mail/brand'
import { buildAccent, renderMail, type RenderedMail } from '../mail/layout'
import { threadHeaders } from './replyMail'
import { replySubject } from './subject'
import type { InquiryStatus } from './types'

/**
 * „Akceptuję ofertę” → an automatic confirmation in the brand look. The customer's acceptance is
 * written by their own mail program (the offer's `mailto:` gives only plain text), so what can
 * look like the brand is our answer to it. Pure — the intake job decides, loads and sends.
 *
 * Rules (decision 03.11.2026):
 * - only an answer from the customer's own address (never a stranger quoting the number),
 * - only when an offer went out (`offer_sent`) or the order is already made (`won`),
 * - only once per inquiry — the job checks the thread for an earlier confirmation.
 * No price in this mail: the amount stays the one in the offer the customer accepted.
 */

/** The topic of the confirmation in the thread — also how the job finds an earlier one. */
export const ACCEPTANCE_TOPIC = 'Mamy Twoją akceptację'

/** „Akceptuję ofertę” in a subject, with or without Polish letters, any case. */
export function isAcceptance(subject: string): boolean {
  const plain = subject.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  return /akceptuje\s+oferte/.test(plain)
}

export function acceptanceApplies(input: {
  subject: string
  fromCustomer: boolean
  status: InquiryStatus
  alreadyConfirmed: boolean
}): boolean {
  return (
    isAcceptance(input.subject) &&
    input.fromCustomer &&
    (input.status === 'offer_sent' || input.status === 'won') &&
    !input.alreadyConfirmed
  )
}

export type AcceptanceMail = RenderedMail & {
  to: string
  subject: string
  text: string
  messageId: string
  inReplyTo?: string
  references?: string[]
}

export function acceptanceMail(input: {
  to: string
  number: string
  /** The thread topic (e.g. „Wilkołak”). */
  topic: string
  buildName: string | null
  /** `site-settings.fulfilment`, e.g. „5–10 dni roboczych od wpłaty”. */
  leadTime: string | null
  siteUrl: string
  messageId: string
  /** Earlier ids of the thread, oldest first — the customer's acceptance last. */
  previousIds: readonly (string | null | undefined)[]
}): AcceptanceMail {
  const steps = [
    {
      title: 'Faktura pro forma',
      text: 'Wyślemy ją mailem w tym wątku.',
    },
    { title: 'Wpłata', text: 'Przelewem albo BLIK-iem. Napiszemy, gdy ją zaksięgujemy.' },
    {
      title: 'Montaż i testy',
      text: input.leadTime
        ? `Składamy w ${input.leadTime}: montaż, test obciążeniowy, pomiary w grach i metryka.`
        : 'Montaż, test obciążeniowy, pomiary w grach i metryka.',
    },
    {
      title: 'Wysyłka albo odbiór',
      text: 'Każdy etap zobaczysz w mailach i na koncie na stronie.',
    },
  ]
  const text = [
    'Dzień dobry,',
    '',
    `dziękujemy — mamy Twoją akceptację oferty ${input.number} (${input.topic}).`,
    '',
    'Co dalej:',
    ...steps.map((s, i) => `${i + 1}. ${s.title}: ${s.text}`),
    '',
    'Pytanie? Odpowiedz na tego maila albo zadzwoń: 883 200 151.',
    '',
    'PRO-KOM Gaming',
  ].join('\n')

  const rendered = renderMail({
    preheader: `Oferta ${input.number} przyjęta — teraz faktura pro forma.`,
    tagLabel: `Zapytanie ${input.number}`,
    status: 'Akceptacja otrzymana',
    title: 'Mamy Twoją akceptację.',
    lead: `Dziękujemy. Oferta ${input.number} jest przyjęta — następny krok to faktura pro forma.`,
    blocks: [
      {
        kind: 'card',
        eyebrow: 'Przyjęta oferta',
        title: input.topic,
        accent: buildAccent(input.buildName),
        rows: [{ label: 'Numer', value: input.number, strong: true }],
      },
      { kind: 'steps', title: 'Co dalej', steps },
      {
        kind: 'callout',
        title: 'Pytanie albo zmiana?',
        text: 'Odpowiedz na tego maila — trafi prosto do nas, w ten sam wątek.',
        button: phoneButton,
      },
    ],
    footer: mailFooter(
      input.siteUrl,
      `Potwierdzenie akceptacji oferty ${input.number} — wysłane automatycznie po Twojej odpowiedzi.`,
    ),
  })

  return {
    ...rendered,
    to: input.to,
    subject: replySubject(input.number, ACCEPTANCE_TOPIC),
    text,
    messageId: input.messageId,
    ...threadHeaders(input.previousIds),
  }
}
