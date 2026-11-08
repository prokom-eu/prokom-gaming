import { NUMBER_PREFIX } from '../inquiry/number'

/**
 * Which inquiry an incoming mail belongs to (ADR-G008 pt 3): the inquiry number in the subject,
 * else `In-Reply-To` / `References` pointing at one of our messages, else „Nieprzypisane”.
 * Pure: the job looks the candidates up and this decides.
 */

const NUMBER_IN_TEXT = new RegExp(`(?<![A-Za-z0-9])${NUMBER_PREFIX}-(\\d{4})-(\\d{4,})(?!\\d)`, 'i')

/** `PKG-2026-0047` from a subject, upper case, or `null`. */
export function numberIn(subject: string): string | null {
  const found = NUMBER_IN_TEXT.exec(subject)
  return found ? `${NUMBER_PREFIX}-${found[1]}-${found[2]}` : null
}

export type ThreadCandidate = { id: number; email: string }

export type MatchDecision = {
  inquiryId: number
  by: 'number' | 'reference'
  /** The sender's address when it is not the customer's (shown as „inny nadawca”), else `null`. */
  otherSender: string | null
}

export function decideMatch(
  from: string,
  found: { byNumber: ThreadCandidate | null; byReference: ThreadCandidate | null },
): MatchDecision | null {
  const by = found.byNumber ? 'number' : found.byReference ? 'reference' : null
  const thread = found.byNumber ?? found.byReference
  if (!by || !thread) return null
  const sender = from.trim().toLowerCase()
  return {
    inquiryId: thread.id,
    by,
    otherSender: sender === thread.email.trim().toLowerCase() ? null : sender,
  }
}
