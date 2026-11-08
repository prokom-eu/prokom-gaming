import { zl } from '../pricing/format'
import { BUDGET_CHOICES, INQUIRY_TYPE_CHOICES, labelOf, type InquiryType } from './types'

type Budget = (typeof BUDGET_CHOICES)[number]['value']

export type TopicInput = {
  type: InquiryType
  /** Name of the build (or of the unit's build for `ready`). */
  buildName?: string | null
  budget?: Budget | null
  voucherAmount?: number | null
}

/**
 * What an inquiry is about, in a few words (panel spec §4 „temat”): the build, „Dobór do 6 000 zł”,
 * „Własna konfiguracja”, „Bon 1 000 zł”, „Gotowy: Wampir”, else the type's name. Used by the list,
 * the thread header and the reply subject.
 */
export function inquiryTopic({ type, buildName, budget, voucherAmount }: TopicInput): string {
  const name = buildName?.trim()
  switch (type) {
    case 'build':
      if (name) return name
      break
    case 'config':
    case 'compare':
      return name ? `${name} (zmieniony)` : 'Własna konfiguracja'
    case 'ready':
      if (name) return `Gotowy: ${name}`
      break
    case 'advice':
      if (budget && budget !== 'unsure') return `Dobór ${labelOf(BUDGET_CHOICES, budget)}`
      return 'Dobór zestawu'
    case 'voucher':
      if (voucherAmount) return `Bon ${zl(voucherAmount)}`
      break
    case 'custom_list':
    case 'contact':
      break
  }
  return labelOf(INQUIRY_TYPE_CHOICES, type)
}

/** One header line: no CR/LF, so a value cannot add headers to the e-mail. */
const oneLine = (value: string) => value.replace(/[\r\n]+/g, ' ').trim()

/** Subject of every reply in the thread (ADR-G008): `Re: [PKG-2026-0047] Wampir`. */
export function replySubject(number: string, topic: string): string {
  return `Re: [${oneLine(number)}] ${oneLine(topic)}`
}

/** Panel address of an inquiry — the number only, never personal data (panel spec §1). */
export const inquiryPanelPath = (number: string) =>
  `/admin/zapytania?nr=${encodeURIComponent(number)}`
