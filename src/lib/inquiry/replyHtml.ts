import { mailFooter, phoneButton, signatureLines } from '../mail/brand'
import { buildAccent, renderMail, type MailBlock, type RenderedMail } from '../mail/layout'

/**
 * The HTML of a reply from the panel (board 09 B): the text as written in the reply box, in the
 * brand layout. The text stays the source — nothing here adds words the panel did not show.
 * - The signature (from the mail settings) at the end becomes the signature block with the mark.
 * - A paragraph of „• …” lines becomes a list.
 * - An offer (template kind `offer`) gets the offer card: every part by name with its role, the
 *   total, the lead time, how long it is valid and „Akceptuję ofertę”. The parts list in the text
 *   is then left out of the HTML (the card shows it); the plain-text version keeps it.
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

function splitSignature(body: string, signature: string | null): { text: string; sign: string } {
  const sign = (signature ?? '').replace(/\r\n/g, '\n').trim()
  if (sign && body.endsWith(sign)) return { text: body.slice(0, -sign.length).trim(), sign }
  return { text: body, sign: '' }
}

function offerBlocks(input: ReplyHtmlInput, offer: ReplyOffer): MailBlock[] {
  const accept = `mailto:${input.replyAddress}?subject=${encodeURIComponent(
    `Re: [${input.number}] Akceptuję ofertę`,
  )}&body=${encodeURIComponent(`Akceptuję ofertę ${input.number}.`)}`
  return [
    {
      kind: 'card',
      eyebrow: `Oferta ${input.number} · ważna ${OFFER_VALIDITY}`,
      title: offer.topic,
      subtitle: offer.leadTime ? `Termin złożenia: ${offer.leadTime} od wpłaty` : undefined,
      accent: buildAccent(offer.buildName),
      rows: offer.parts.map((p) => ({ label: p.role, value: p.model })),
      price: offer.price
        ? { label: 'Razem brutto', value: offer.price, note: 'z montażem i testami' }
        : undefined,
    },
    {
      kind: 'buttons',
      buttons: [{ label: 'Akceptuję ofertę', href: accept, primary: true }, phoneButton],
    },
    {
      kind: 'paragraph',
      muted: true,
      text: '„Akceptuję ofertę” otwiera odpowiedź do nas — wystarczy ją wysłać. Potem przyślemy fakturę pro forma.',
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
    if (offer && (isList(lines) || isHeadedList(lines))) {
      // The card lists the parts with their roles — no second list from the text.
      if (!offerPlaced) blocks.push(...offerBlocks(input, offer))
      offerPlaced = true
      continue
    }
    if (isHeadedList(lines)) {
      blocks.push({ kind: 'heading', text: (lines[0] ?? '').replace(/:\s*$/, '') })
      blocks.push({ kind: 'list', items: lines.slice(1).map(stripBullet) })
    } else if (isList(lines)) {
      blocks.push({ kind: 'list', items: lines.map(stripBullet) })
    } else if (paragraph.trim()) {
      blocks.push({ kind: 'paragraph', text: paragraph.trim() })
    }
  }
  // An offer whose text has no parts list: the card goes after the opening paragraphs.
  if (offer && !offerPlaced)
    blocks.splice(Math.min(2, blocks.length), 0, ...offerBlocks(input, offer))

  // Only the signature that was written — the panel adds none on its own.
  if (sign) blocks.push({ kind: 'signature', lines: signatureLines(sign, input.siteUrl) })

  const firstSentence =
    text
      .split(/\n{2,}/)
      .find((p) => !/^dzień dobry/i.test(p.trim()))
      ?.replace(/^\s*[•\-–]\s+/gm, '')
      ?.replace(/\s+/g, ' ')
      .slice(0, 140) ?? ''
  return renderMail({
    preheader: firstSentence,
    tagLabel: `${offer ? 'Oferta' : 'Odpowiedź'} ${input.number}`,
    blocks,
    footer: mailFooter(
      input.siteUrl,
      `Odpowiedź na zapytanie ${input.number}. Odpisz na tego maila — numer w temacie łączy całą rozmowę.`,
    ),
  })
}
