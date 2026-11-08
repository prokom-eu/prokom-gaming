import { CONTACT_CONSENT_CLAUSE } from './consent'
import { FORM_TOKEN_FIELD, HONEYPOT_FIELD } from './honeypot'
import { PAYLOAD_EMAIL } from './rules'

/**
 * „Krótkie pytanie?” on `/kontakt` (spec. §18, board Kontakt): name, e-mail, message and consent,
 * sent as an inquiry of type `contact` (ADR-G005). Pure — the component only renders it.
 */
export type ContactState = { name: string; email: string; message: string; consent: boolean }

export type ContactField = keyof ContactState

export const EMPTY_CONTACT: ContactState = { name: '', email: '', message: '', consent: false }

/** Messages 1:1 from the board. */
export const CONTACT_MESSAGES = {
  name: 'Wpisz imię.',
  emailEmpty: 'Wpisz e-mail, na który odpiszemy.',
  emailInvalid: 'Ten e-mail wygląda na niepełny. Sprawdź @ i domenę.',
  message: 'Napisz kilka słów, w czym możemy pomóc.',
  consent: 'Zaznacz zgodę, żebyśmy mogli odpisać.',
} as const

/** Errors of the fields; empty object = ready to send. Same e-mail rule as the server. */
export function contactErrors(state: ContactState): Partial<Record<ContactField, string>> {
  const errors: Partial<Record<ContactField, string>> = {}
  const email = state.email.trim()
  if (!state.name.trim()) errors.name = CONTACT_MESSAGES.name
  if (!email) errors.email = CONTACT_MESSAGES.emailEmpty
  else if (!PAYLOAD_EMAIL.test(email)) errors.email = CONTACT_MESSAGES.emailInvalid
  if (!state.message.trim()) errors.message = CONTACT_MESSAGES.message
  if (!state.consent) errors.consent = CONTACT_MESSAGES.consent
  return errors
}

/** First rejected field of a 400 answer that has a place on the form (`consent.accepted` → consent). */
export function contactFieldOf(fields: readonly string[]): ContactField | null {
  const known: ContactField[] = ['name', 'email', 'message', 'consent']
  for (const path of fields) {
    const key = path.split('.')[0] as ContactField
    if (known.includes(key)) return key
  }
  return null
}

// TODO(krystian): texts not on the board (sending errors), like the form's in G12.
export const CONTACT_SEND_ERRORS = {
  invalid: 'Coś się nie zgadza w zaznaczonym polu. Popraw i wyślij jeszcze raz.',
  rate_limited: 'Wysłano już kilka wiadomości z tego adresu. Spróbuj za kilka minut albo zadzwoń.',
  expired: 'Formularz był otwarty zbyt długo. Odśwież stronę i wyślij jeszcze raz.',
  unavailable: 'Nie udało się wysłać wiadomości. Spróbuj za chwilę albo zadzwoń.',
} as const

export type ContactSendError = keyof typeof CONTACT_SEND_ERRORS

/** Error of an answer that is not 201 (body as `/api/inquiry` sends it). */
export function contactSendErrorOf(status: number, error?: string): ContactSendError {
  if (status === 429) return 'rate_limited'
  // `rejected`: the honeypot or the form token — a person only meets an expired token.
  if (status === 400 && error === 'rejected') return 'expired'
  if (status === 400) return 'invalid'
  return 'unavailable'
}

/** Body of `POST /api/inquiry`. The server sets the number, status and consent time. */
export function contactPayload(
  state: ContactState,
  context: { url: string; token: string; honeypot: string },
) {
  const url = new URL(context.url)
  const utm = (key: string) => url.searchParams.get(key) ?? undefined
  return {
    type: 'contact' as const,
    name: state.name.trim(),
    email: state.email.trim(),
    message: state.message.trim(),
    consent: { accepted: state.consent, clauseVersion: CONTACT_CONSENT_CLAUSE.version },
    marketingConsent: false,
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
