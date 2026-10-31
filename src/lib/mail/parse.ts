import { simpleParser, type AddressObject, type HeaderValue } from 'mailparser'

/**
 * One incoming e-mail as the panel keeps it (ADR-G008 pt 4): plain text only (HTML → text by
 * mailparser, so no tags, scripts or remote images ever reach the panel), the quoted earlier mail
 * cut off, attachments listed by name and size but never stored. Pure apart from parsing.
 */

/** Longest body kept (ADR-G008 pt 4; same as `inquiry-messages.body`). */
export const MAX_BODY = 20_000

/** Headers that tell an autoresponder or a bulk mail (ADR-G008 pt 2). */
const AUTO_HEADERS = ['auto-submitted', 'precedence', 'x-autoreply', 'x-autorespond'] as const
type AutoHeader = (typeof AUTO_HEADERS)[number]

export type IncomingMail = {
  /** Sender's address, lower case; `null` when the mail has none. */
  from: string | null
  subject: string
  messageId: string | null
  /** `In-Reply-To` first, then `References` from the newest — the order matching tries them in. */
  references: string[]
  /** ISO time from the `Date` header, else the time of parsing. */
  receivedAt: string
  body: string
  /** „faktura.pdf (12 KB); zdjęcie.jpg (1,2 MB)” or `null`. */
  attachmentsInfo: string | null
  headers: Partial<Record<AutoHeader, string>>
}

const headerText = (value: HeaderValue | undefined): string | undefined => {
  if (value === undefined || value === null) return undefined
  if (typeof value === 'string') return value
  if (typeof value === 'object' && 'value' in value && typeof value.value === 'string') {
    return value.value
  }
  return String(value)
}

const firstAddress = (from: AddressObject | undefined): string | null =>
  from?.value
    .find((a) => a.address)
    ?.address?.trim()
    .toLowerCase() || null

const listOf = (value: string | string[] | undefined): string[] =>
  value === undefined ? [] : Array.isArray(value) ? value : value.split(/\s+/)

/** `In-Reply-To`, then `References` newest first, without duplicates or empty values. */
export function referenceIds(inReplyTo: string | undefined, references: string[]): string[] {
  const ids = [...listOf(inReplyTo), ...[...references].reverse()]
    .map((id) => id.trim())
    .filter((id) => id !== '')
  return [...new Set(ids)]
}

const KB = 1024
const formatSize = (bytes: number) =>
  bytes < KB * KB
    ? `${Math.max(1, Math.ceil(bytes / KB))} KB`
    : `${(bytes / KB / KB).toFixed(1).replace('.', ',')} MB`

/**
 * Lines that start the quoted earlier message: Gmail/Apple/Thunderbird in Polish and English,
 * Outlook's „-----Original Message-----” and its „Od: … / Wysłano:” block.
 */
const QUOTE_HEADERS: RegExp[] = [
  /^W dniu .+(napisał|napisała|napisał\(a\)|pisze):\s*$/i,
  /^On .+wrote:\s*$/i,
  /^-{2,}\s*(Original Message|Wiadomość oryginalna|Oryginalna wiadomość)\s*-{2,}\s*$/i,
]
const OUTLOOK_FROM = /^(Od|From):\s/i
const OUTLOOK_NEXT = /^(Wysłano|Sent|Data|Date|Temat|Subject|Do|To):\s/i

function quoteStart(lines: string[]): number {
  for (let i = 0; i < lines.length; i += 1) {
    const line = (lines[i] ?? '').trim()
    const joined = `${line} ${(lines[i + 1] ?? '').trim()}`.trim()
    if (QUOTE_HEADERS.some((re) => re.test(line) || re.test(joined))) return i
    if (OUTLOOK_FROM.test(line) && OUTLOOK_NEXT.test((lines[i + 1] ?? '').trim())) return i
  }
  // A trailing block of `>` lines (inline answers between `>` lines are kept).
  let start = lines.length
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    const line = (lines[i] ?? '').trim()
    if (line === '' || line.startsWith('>')) {
      if (line.startsWith('>')) start = i
      continue
    }
    break
  }
  return start
}

/** Cuts the quoted earlier mail; keeps the text whole when nothing would be left. */
export function stripQuoted(text: string): string {
  const lines = text.replace(/\r\n?/g, '\n').split('\n')
  const kept = lines.slice(0, quoteStart(lines)).join('\n').trim()
  return kept === '' ? text.trim() : kept
}

// mailparser's HTML → text writes images and links as „[https://…]”: a remote image (tracking
// pixel) must not show up as an address, and a link's text is already there.
const BRACKETED_URL = /\s*\[(?:https?|cid|data):[^\]\s]*\]/gi

const tidy = (text: string) =>
  text
    .replace(BRACKETED_URL, '')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

const capped = (text: string) =>
  text.length > MAX_BODY ? `${text.slice(0, MAX_BODY - 1).trimEnd()}…` : text

export async function parseMail(source: Buffer | string): Promise<IncomingMail> {
  const mail = await simpleParser(source, {
    // No data: URIs from cid: images and no links rendered into the text.
    keepCidLinks: true,
    skipImageLinks: true,
    skipTextLinks: true,
    skipTextToHtml: true,
  })
  const headers: IncomingMail['headers'] = {}
  for (const name of AUTO_HEADERS) {
    const value = headerText(mail.headers.get(name))
    if (value) headers[name] = value.trim()
  }
  const attachments = mail.attachments.filter((a) => !a.related)
  return {
    from: firstAddress(mail.from),
    subject: (mail.subject ?? '').trim(),
    messageId: mail.messageId?.trim() || null,
    references: referenceIds(mail.inReplyTo, listOf(mail.references)),
    receivedAt: (mail.date && !Number.isNaN(mail.date.getTime())
      ? mail.date
      : new Date()
    ).toISOString(),
    body: capped(stripQuoted(tidy(mail.text ?? ''))),
    attachmentsInfo:
      attachments.length === 0
        ? null
        : attachments.map((a) => `${a.filename ?? 'bez nazwy'} (${formatSize(a.size)})`).join('; '),
    headers,
  }
}

const BOUNCE_SENDER = /^(mailer-daemon|postmaster)@/i

/**
 * Why a mail is not taken into the panel (ADR-G008 pt 2): our own messages (notifications,
 * confirmations, our replies — the same mailbox sends them) and automatic ones (autoresponders,
 * bulk mail, bounces). `null` = take it.
 */
export function skipReason(
  mail: Pick<IncomingMail, 'from' | 'headers'>,
  ownAddress: string,
): 'own' | 'auto' | null {
  if (!mail.from || BOUNCE_SENDER.test(mail.from)) return 'auto'
  if (mail.from === ownAddress.trim().toLowerCase()) return 'own'
  const { headers } = mail
  const submitted = headers['auto-submitted']?.toLowerCase()
  if (submitted && submitted !== 'no') return 'auto'
  if (/^(bulk|auto_reply|junk|list)$/i.test(headers.precedence ?? '')) return 'auto'
  if (headers['x-autoreply'] || headers['x-autorespond']) return 'auto'
  return null
}
