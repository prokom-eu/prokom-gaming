import { stageLabel, type OrderStage } from './orders'
import { renderTemplate } from './inquiry/templates'
import { textToHtml } from './inquiry/replyMail'

/**
 * The e-mail to the customer when the workshop moves their order (panel spec §7, template kind
 * `stage`, spec §4). Pure — the panel action loads the template and sends it.
 */

/**
 * Text of the 5th starting template (spec §4). Used when the database has no active `stage`
 * template — the seed does not run on the server.
 */
export const DEFAULT_STAGE_TEMPLATE =
  'Dzień dobry,\n\nTwój komputer {zestaw} (zamówienie {nr_zam}) jest teraz na etapie: {etap}.\n\n{podpis}'

export type StageMail = { to: string; subject: string; text: string; html: string }

export function buildStageMail(input: {
  to: string
  orderNumber: string
  stage: OrderStage
  buildName: string | null
  signature: string | null
  template: string | null
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
  return {
    to: input.to,
    // TODO(krystian): subject of the stage e-mail — not on any board.
    subject: `[${input.orderNumber}] Twój komputer: ${etap}`,
    text: clean,
    html: textToHtml(clean),
  }
}
