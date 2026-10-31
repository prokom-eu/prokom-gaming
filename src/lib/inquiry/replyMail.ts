import { replySubject } from './subject'

/**
 * E-mails of the inquiry thread (ADR-G008 pt 1): our own `Message-ID` on every message, and
 * `In-Reply-To` / `References` pointing back at the thread, so the customer's mail program shows
 * one conversation and their answer can be matched back (P4). Pure — no Payload, no SMTP.
 */

const MAX_REFERENCES = 20

/** `<uuid@domain-of-the-sender>` — known before sending, so it is saved with the message. */
export function newMessageId(fromAddress: string, uuid: string): string {
  const domain = fromAddress.split('@')[1]?.trim().toLowerCase() || 'localhost'
  return `<${uuid}@${domain}>`
}

/** Threading headers from the earlier ids of the thread, oldest first (empty ones skipped). */
export function threadHeaders(previousIds: readonly (string | null | undefined)[]): {
  inReplyTo?: string
  references?: string[]
} {
  const ids = previousIds.filter((id): id is string => typeof id === 'string' && id.trim() !== '')
  if (ids.length === 0) return {}
  // The first message stays: mail programs thread by the root, then by the latest ones.
  const references =
    ids.length > MAX_REFERENCES ? [ids[0] as string, ...ids.slice(-(MAX_REFERENCES - 1))] : ids
  return { inReplyTo: ids[ids.length - 1], references }
}

const escapeHtml = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** The simple HTML version: paragraphs from blank lines, line breaks kept, everything escaped. */
export function textToHtml(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .trim()
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`)
    .join('\n')
}

export type ReplyMail = {
  to: string
  subject: string
  text: string
  html: string
  messageId: string
  inReplyTo?: string
  references?: string[]
}

/** One reply from the panel: `Re: [PKG-…] <topic>`, the text as written — no signature added. */
export function buildReplyMail(input: {
  to: string
  number: string
  topic: string
  body: string
  messageId: string
  previousIds: readonly (string | null | undefined)[]
}): ReplyMail {
  const text = input.body.replace(/\r\n/g, '\n').trim()
  return {
    to: input.to,
    subject: replySubject(input.number, input.topic),
    text,
    html: textToHtml(text),
    messageId: input.messageId,
    ...threadHeaders(input.previousIds),
  }
}
