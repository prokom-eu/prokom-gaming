import { mailFooter, phoneButton, signatureLines } from '../mail/brand'
import { buildAccent, renderMail, type MailBlock, type RenderedMail } from '../mail/layout'

/**
 * The HTML of a reply from the panel (board 09 B): the text as written in the reply box, in the
 * brand layout. The text stays the source — nothing here adds words the panel did not show.
 * - The signature (from the mail settings) at the end becomes the signature block with the mark.
 * - A paragraph of „• …” lines becomes a list.
 * - An offer (template kind `offer`): when the text lists exactly the parts of the configuration,
 *   that list becomes the offer card — each part with its role — and „Akceptuję ofertę”. The
 *   card shows the total, the lead time and the validity only when the text says them, in the
 *   same words; an edited list (a part swapped, removed) stays a plain list and gets no card.
 *   The plain-text version is the text as written.
 * Pure — no Payload, no SMTP.
 */

/** How long an offer holds (decision 31.10.2026: today's batch price, 48 h). */
export const OFFER_VALIDITY = '48 godzin'

export type OfferPart = { role: string; model: string }

export type ReplyOffer = {
  /** What the offer is for (the thread topic, e.g. „Wilkołak”). */
  topic: string
  /** Name of the build, for its colour; `null` for an own configuration. */
  buildName: string | null
  parts: OfferPart[]
  /** Formatted total, e.g. „9 890 zł”; `null` when not priceable. */
  price: string | null
  /** Lead time from the site settings (e.g. „5–10 dni roboczych”). */
  leadTime: string | null
}

export type ReplyHtmlInput = {
  number: string
  body: string
  /** `mail-settings.signature` — recognised at the end of the body. */
  signature: string | null
  siteUrl: string
  /** Our mailbox: „Akceptuję ofertę” writes back to it with the number in the subject. */
  replyAddress: string
  offer?: ReplyOffer | null
}

const BULLET = /^\s*[•\-–]\s+/

const isList = (lines: string[]) => lines.length > 0 && lines.every((l) => BULLET.test(l))

/** „Skład:\n• …” — a short heading line followed by a list. */
const isHeadedList = (lines: string[]) =>
  lines.length > 1 && /:\s*$/.test(lines[0] ?? '') && isList(lines.slice(1))

const stripBullet = (line: string) => line.replace(BULLET, '')

/** The written signature at the end of a text, split off (empty when it is not there). */
export function splitSignature(
  body: string,
  signature: string | null,
): { text: string; sign: string } {
  const sign = (signature ?? '').replace(/\r\n/g, '\n').trim()
  if (sign && body.endsWith(sign)) return { text: body.slice(0, -sign.length).trim(), sign }
  return { text: body, sign: '' }
}

const norm = (value: string) => value.replace(/\s+/g, ' ').trim().toLowerCase()

/** The list in the text is the configuration's parts — same models, nothing added or dropped. */
function listsParts(items: string[], parts: OfferPart[]): boolean {
  const a = items.map(norm).sort()
  const b = parts.map((p) => norm(p.model)).sort()
  return a.length === b.length && a.every((item, i) => item === b[i])
}

function offerBlocks(input: ReplyHtmlInput, offer: ReplyOffer, text: string): MailBlock[] {
  const says = (value: string | null) => (value ? norm(text).includes(norm(value)) : false)
  const accept = `mailto:${input.replyAddress}?subject=${encodeURIComponent(
    `Re: [${input.number}] Akceptuję ofertę`,
  )}&body=${encodeURIComponent(`Akceptuję ofertę ${input.number}.`)}`
  return [
    {
      kind: 'card',
      eyebrow: says(OFFER_VALIDITY)
        ? `Oferta ${input.number} · ważna ${OFFER_VALIDITY}`
        : `Oferta ${input.number}`,
      title: offer.topic,
      subtitle: says(offer.leadTime) ? `Termin złożenia: ${offer.leadTime}` : undefined,
      accent: buildAccent(offer.buildName),
      rows: offer.parts.map((p) => ({ label: p.role, value: p.model })),
      // The total only when the text names the same amount — never a second, different price.
      price: offer.price && says(offer.price) ? { label: 'Razem', value: offer.price } : undefined,
    },
    {
      kind: 'buttons',
      buttons: [{ label: 'Akceptuję ofertę', href: accept, primary: true }, phoneButton],
    },
    {
      kind: 'paragraph',
      muted: true,
      text: '„Akceptuję ofertę” otwiera odpowiedź do nas — wystarczy ją wysłać.',
    },
  ]
}

export function replyHtml(input: ReplyHtmlInput): RenderedMail {
  const body = input.body.replace(/\r\n/g, '\n').trim()
  const { text, sign } = splitSignature(body, input.signature)
  const offer = input.offer && input.offer.parts.length > 0 ? input.offer : null

  const blocks: MailBlock[] = []
  let offerPlaced = false
  for (const paragraph of text.split(/\n{2,}/)) {
    const lines = paragraph.split('\n').map((l) => l.trimEnd())
    const headed = isHeadedList(lines)
    const items = headed
      ? lines.slice(1).map(stripBullet)
      : isList(lines)
        ? lines.map(stripBullet)
        : null
    if (offer && !offerPlaced && items && listsParts(items, offer.parts)) {
      // This list is the configuration: the card shows it with the roles.
      blocks.push(...offerBlocks(input, offer, text))
      offerPlaced = true
      continue
    }
    if (headed) {
      blocks.push({ kind: 'heading', text: (lines[0] ?? '').replace(/:\s*$/, '') })
      blocks.push({ kind: 'list', items: items ?? [] })
    } else if (items) {
      blocks.push({ kind: 'list', items })
    } else if (paragraph.trim()) {
      blocks.push({ kind: 'paragraph', text: paragraph.trim() })
    }
  }

  // Only the signature that was written — the panel adds none on its own.
  if (sign) blocks.push({ kind: 'signature', lines: signatureLines(sign, input.siteUrl) })

  const firstSentence =
    text
      .split(/\n{2,}/)
      .map((p) => p.replace(/^\s*dzień dobry[,!.]?\s*/i, '').trim())
      .find((p) => p !== '')
      ?.replace(/^\s*[•\-–]\s+/gm, '')
      ?.replace(/\s+/g, ' ')
      .slice(0, 140) ?? ''
  return renderMail({
    preheader: firstSentence,
    tagLabel: `${offerPlaced ? 'Oferta' : 'Odpowiedź'} ${input.number}`,
    blocks,
    footer: mailFooter(
      input.siteUrl,
      `Odpowiedź na zapytanie ${input.number}. Odpisz na tego maila — numer w temacie łączy całą rozmowę.`,
    ),
  })
}
