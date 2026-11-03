import { renderTemplate } from './inquiry/templates'
import { splitSignature } from './inquiry/replyHtml'
import { DEFAULT_SITE_URL, mailFooter, signatureLines } from './mail/brand'
import { renderMail, type MailBlock, type RenderedMail } from './mail/layout'
import { ORDER_STAGE_CHOICES, stageLabel, type OrderStage } from './orders'

/**
 * The e-mail to the customer when the workshop moves their order (panel spec §7, template kind
 * `stage`, spec §4; look: board 09 C). Pure — the panel action loads the template and sends it.
 */

/**
 * Text of the 5th starting template (spec §4). Used when the database has no active `stage`
 * template — the seed does not run on the server.
 */
export const DEFAULT_STAGE_TEMPLATE =
  'Dzień dobry,\n\nTwój komputer {zestaw} (zamówienie {nr_zam}) jest teraz na etapie: {etap}.\n\n{podpis}'

/** The 7 stages of the bar (board 09 C): the panel columns, without the final „U klienta”. */
const BAR_STAGES = ORDER_STAGE_CHOICES.filter((c) => c.value !== 'delivered')

/**
 * Headline and the line under it for each stage that sends a mail (`STAGE_MAIL_STAGES`).
 * Board 09 C shows `assembly`; TODO(krystian): the others are drafts in the same tone.
 */
const STAGE_HEADLINES: Partial<Record<OrderStage, { title: string; lead: string }>> = {
  paid: {
    title: 'Wpłata dotarła.',
    lead: 'Dziękujemy — kompletujemy części do Twojego komputera. Następny krok: montaż.',
  },
  assembly: {
    title: 'Składamy Twój komputer.',
    lead: 'Wszystkie części dotarły i są na stole montażowym. Następny krok: testy obciążeniowe i metryka komputera.',
  },
  test: {
    title: 'Testujemy Twój komputer.',
    lead: 'Komputer jest złożony. Teraz test obciążeniowy i pomiary klatek w grach — wyniki trafią do metryki.',
  },
  // Neutral: the same stage covers a courier and a pickup in the shop (checklist „SMS do odbioru”).
  shipped: {
    title: 'Komputer jest spakowany i gotowy.',
    lead: 'Wydaliśmy go kurierowi albo czeka na odbiór w Rabce-Zdroju — tak, jak ustaliliśmy.',
  },
}

export type StageMail = {
  to: string
  subject: string
  text: string
  html: string
  attachments: RenderedMail['attachments']
}

export function buildStageMail(input: {
  to: string
  orderNumber: string
  stage: OrderStage
  buildName: string | null
  signature: string | null
  template: string | null
  trackingNumber?: string | null
  /** The site's address for the footer links. */
  siteUrl?: string
}): StageMail {
  const etap = stageLabel(input.stage)
  const body = (input.template?.trim() || DEFAULT_STAGE_TEMPLATE)
    .replaceAll('{nr_zam}', input.orderNumber)
    .replaceAll('{etap}', etap)
  // A value that is not known leaves nothing behind (no `{zestaw}` in a customer's mail).
  const { text } = renderTemplate(body, { zestaw: input.buildName, podpis: input.signature })
  const clean = text
    .replace(/\{(zestaw|podpis)\}/g, '')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
  // The text version says what the HTML shows: the tracking number once there is one.
  const tracking = input.trackingNumber?.trim()
  return {
    to: input.to,
    // TODO(krystian): subject of the stage e-mail — not on any board.
    subject: `[${input.orderNumber}] Twój komputer: ${etap}`,
    text: tracking ? `${clean}\n\nNumer przesyłki: ${tracking}` : clean,
    ...stageHtml({ ...input, text: clean, etap }),
  }
}

function stageHtml(input: {
  orderNumber: string
  stage: OrderStage
  buildName: string | null
  signature: string | null
  trackingNumber?: string | null
  siteUrl?: string
  text: string
  etap: string
}): RenderedMail {
  const siteUrl = input.siteUrl || DEFAULT_SITE_URL
  const index = BAR_STAGES.findIndex((c) => c.value === input.stage)
  const current = index === -1 ? BAR_STAGES.length : index
  const headline = STAGE_HEADLINES[input.stage]
  const { text, sign } = splitSignature(input.text, input.signature)
  const tracking = input.trackingNumber?.trim()

  const blocks: MailBlock[] = [
    {
      kind: 'stages',
      label: `Etap ${Math.min(current + 1, BAR_STAGES.length)} z ${BAR_STAGES.length}`,
      stages: BAR_STAGES.map((c) => c.label),
      current,
    },
    {
      kind: 'section',
      title: 'Twoje zamówienie',
      rows: [
        { label: 'Numer', value: input.orderNumber, strong: true },
        ...(input.buildName ? [{ label: 'Zestaw', value: input.buildName }] : []),
        { label: 'Etap', value: input.etap },
        ...(tracking ? [{ label: 'Numer przesyłki', value: tracking, strong: true }] : []),
      ],
    },
    ...text
      .split(/\n{2,}/)
      .filter((p) => p.trim())
      .map((p): MailBlock => ({ kind: 'paragraph', text: p.trim() })),
    ...(sign ? [{ kind: 'signature' as const, lines: signatureLines(sign, siteUrl) }] : []),
    {
      kind: 'callout',
      title: 'Pytanie o zamówienie?',
      text: `Odpowiedz na tego maila — numer ${input.orderNumber} w temacie łączy wszystko w jedną rozmowę.`,
    },
  ]
  return renderMail({
    preheader: headline ? `${headline.title} ${headline.lead}` : `Etap: ${input.etap}`,
    tagLabel: `Zamówienie ${input.orderNumber}`,
    status: input.buildName ? `${input.buildName} · ${input.etap}` : input.etap,
    title: headline?.title ?? `Etap: ${input.etap}`,
    lead: headline?.lead,
    blocks,
    footer: mailFooter(
      siteUrl,
      'Mail o postępie Twojego zamówienia — wysyłamy go przy każdej zmianie etapu.',
    ),
  })
}
