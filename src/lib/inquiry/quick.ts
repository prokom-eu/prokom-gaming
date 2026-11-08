import { CONSENT_CLAUSE } from './consent'
import { CONTACT_MESSAGES, CONTACT_SEND_ERRORS, contactSendErrorOf } from './contact'
import { FORM_TOKEN_FIELD, HONEYPOT_FIELD } from './honeypot'
import { isPhone, PAYLOAD_EMAIL } from './rules'

/**
 * The one-step inquiry of `/bon` and `/gotowe` (G13): the page already holds the order (voucher
 * or unit), the sheet asks only who is asking — name, e-mail, phone (optional), consent — and
 * sends an inquiry of type `voucher` or `ready` (ADR-G005). Pure — the sheet only renders it.
 */
export type QuickState = { name: string; email: string; phone: string; consent: boolean }
export type QuickField = keyof QuickState

export const EMPTY_QUICK: QuickState = { name: '', email: '', phone: '', consent: false }

export const QUICK_MESSAGES = {
  name: CONTACT_MESSAGES.name,
  emailEmpty: CONTACT_MESSAGES.emailEmpty,
  emailInvalid: CONTACT_MESSAGES.emailInvalid,
  // Same text as the G12 form (TODO(krystian) there: not on a board).
  phone: 'Ten numer wygląda na niepełny. Wpisz co najmniej 6 cyfr, np. 600 100 200.',
  consent: 'Zaznacz zgodę, żebyśmy mogli odpisać.',
} as const

export function quickErrors(state: QuickState): Partial<Record<QuickField, string>> {
  const errors: Partial<Record<QuickField, string>> = {}
  const email = state.email.trim()
  const phone = state.phone.trim()
  if (!state.name.trim()) errors.name = QUICK_MESSAGES.name
  if (!email) errors.email = QUICK_MESSAGES.emailEmpty
  else if (!PAYLOAD_EMAIL.test(email)) errors.email = QUICK_MESSAGES.emailInvalid
  if (phone && !isPhone(phone)) errors.phone = QUICK_MESSAGES.phone
  if (!state.consent) errors.consent = QUICK_MESSAGES.consent
  return errors
}

// TODO(krystian): „taken” is not on the board (a unit reserved a moment earlier).
export const QUICK_SEND_ERRORS = {
  ...CONTACT_SEND_ERRORS,
  taken: 'Ktoś przed chwilą zarezerwował ten egzemplarz. Wybierz inny albo napisz do nas.',
} as const
export type QuickSendError = keyof typeof QUICK_SEND_ERRORS

/** Error of an answer that is not 201; a 400 on `stock` = the unit is gone. */
export function quickSendErrorOf(
  status: number,
  body: { error?: string; fields?: string[] },
): QuickSendError {
  if (status === 400 && body.fields?.includes('stock')) return 'taken'
  return contactSendErrorOf(status, body.error)
}

export type QuickOrder =
  | {
      type: 'voucher'
      voucher: { amount: number; design: string; recipient?: string; dedication?: string }
    }
  | { type: 'ready'; stock: number }

/** Body of `POST /api/inquiry`. The server prices the unit and sets number, status and dates. */
export function quickPayload(
  order: QuickOrder,
  state: QuickState,
  context: { url: string; token: string; honeypot: string },
) {
  const url = new URL(context.url)
  const utm = (key: string) => url.searchParams.get(key) ?? undefined
  const phone = state.phone.trim()
  return {
    ...order,
    name: state.name.trim(),
    email: state.email.trim(),
    ...(phone ? { phone } : {}),
    consent: { accepted: state.consent, clauseVersion: CONSENT_CLAUSE.version },
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
