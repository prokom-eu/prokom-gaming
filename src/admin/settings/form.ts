import { z } from 'zod'

/**
 * Section "Marża i narzuty" of /admin/ustawienia (panel spec §13, board Ustawienia): the
 * `pricing-settings` fields as the person types them — percent for shares, złoty for amounts,
 * Polish decimal comma. Pure: the view fills the form with `toFormValues()`, the action parses
 * with `parseSettingsForm()`; Payload validates again on save (min/max, warn ≥ min).
 */

export type PricingForm = {
  minMargin: number
  warnMargin: number
  publishThreshold: number
  serviceCost: number
  caseCoolerBuffer: number
  whiteSurcharge: number
  roundingStep: number
  categoryMarkup: { ram: number; ssd: number }
  levelMarkupByClass: { fullhd: number; qhd: number; uhd: number; flagship: number }
}

export const FIELD_NAMES = [
  'minMargin',
  'warnMargin',
  'fullhd',
  'qhd',
  'uhd',
  'flagship',
  'ramSsd',
  'caseCoolerBuffer',
  'whiteSurcharge',
  'serviceCost',
  'roundingStep',
  'publishThreshold',
] as const
export type FieldName = (typeof FIELD_NAMES)[number]
export type FormValues = Record<FieldName, string>
export type FieldErrors = Partial<Record<FieldName, string>>

/** 0.145 → "14,5"; 0.11 → "11" (no trailing zeros, comma). */
export function percentText(share: number): string {
  return String(Number((share * 100).toFixed(2))).replace('.', ',')
}

const amountText = (zl: number) => String(Number(zl.toFixed(2))).replace('.', ',')

export function toFormValues(s: PricingForm): FormValues {
  return {
    minMargin: percentText(s.minMargin),
    warnMargin: percentText(s.warnMargin),
    fullhd: percentText(s.levelMarkupByClass.fullhd),
    qhd: percentText(s.levelMarkupByClass.qhd),
    uhd: percentText(s.levelMarkupByClass.uhd),
    flagship: percentText(s.levelMarkupByClass.flagship),
    ramSsd: percentText(s.categoryMarkup.ram),
    caseCoolerBuffer: amountText(s.caseCoolerBuffer),
    whiteSurcharge: amountText(s.whiteSurcharge),
    serviceCost: amountText(s.serviceCost),
    roundingStep: amountText(s.roundingStep),
    publishThreshold: percentText(s.publishThreshold),
  }
}

// "14,5", "14.5", " 11 " — at most 2 decimals, no sign, no thousands separators.
const decimal = z
  .string()
  .trim()
  .regex(/^\d{1,6}([.,]\d{1,2})?$/, 'Wpisz liczbę, np. 14,5.')
  .transform((v) => Number(v.replace(',', '.')))

const percent = (max: number) => decimal.refine((v) => v <= max, `Najwyżej ${max}%.`)
const amount = (min = 0) => decimal.refine((v) => v >= min, `Co najmniej ${min} zł.`)

const schema = z
  .object({
    // ≤ 50%: at 100% the markup floor m / (1 − m) is infinite (as in PricingSettings).
    minMargin: percent(50),
    warnMargin: percent(50),
    fullhd: percent(100),
    qhd: percent(100),
    uhd: percent(100),
    flagship: percent(100),
    ramSsd: percent(100),
    caseCoolerBuffer: amount(),
    whiteSurcharge: amount(),
    serviceCost: amount(),
    roundingStep: amount(1),
    publishThreshold: percent(100),
  })
  .superRefine((v, ctx) => {
    if (v.warnMargin < v.minMargin) {
      ctx.addIssue({
        code: 'custom',
        path: ['warnMargin'],
        message: 'Próg ostrzeżenia nie może być niższy niż minimalna marża.',
      })
    }
  })

/** Percent → share without binary noise: 14.5 → 0.145 (not 0.14500000000000002). */
const share = (pct: number) => Math.round(pct * 10_000) / 1_000_000

export function parseSettingsForm(
  raw: Partial<Record<string, unknown>>,
): { ok: true; data: PricingForm } | { ok: false; errors: FieldErrors } {
  const input = Object.fromEntries(
    FIELD_NAMES.map((name) => [name, typeof raw[name] === 'string' ? raw[name] : '']),
  )
  const parsed = schema.safeParse(input)
  if (!parsed.success) {
    const errors: FieldErrors = {}
    for (const issue of parsed.error.issues) {
      const field = issue.path[0] as FieldName
      errors[field] ??= issue.message
    }
    return { ok: false, errors }
  }
  const v = parsed.data
  return {
    ok: true,
    data: {
      minMargin: share(v.minMargin),
      warnMargin: share(v.warnMargin),
      publishThreshold: share(v.publishThreshold),
      serviceCost: v.serviceCost,
      caseCoolerBuffer: v.caseCoolerBuffer,
      whiteSurcharge: v.whiteSurcharge,
      roundingStep: v.roundingStep,
      // One field on the board for both (they are equal in the price sheet).
      categoryMarkup: { ram: share(v.ramSsd), ssd: share(v.ramSsd) },
      levelMarkupByClass: {
        fullhd: share(v.fullhd),
        qhd: share(v.qhd),
        uhd: share(v.uhd),
        flagship: share(v.flagship),
      },
    },
  }
}

/** Where each form field lives in `pricing-settings` (`ramSsd` = both RAM and disks). */
const PATHS: Record<FieldName, readonly string[]> = {
  minMargin: ['minMargin'],
  warnMargin: ['warnMargin'],
  publishThreshold: ['publishThreshold'],
  serviceCost: ['serviceCost'],
  caseCoolerBuffer: ['caseCoolerBuffer'],
  whiteSurcharge: ['whiteSurcharge'],
  roundingStep: ['roundingStep'],
  ramSsd: ['categoryMarkup.ram', 'categoryMarkup.ssd'],
  fullhd: ['levelMarkupByClass.fullhd'],
  qhd: ['levelMarkupByClass.qhd'],
  uhd: ['levelMarkupByClass.uhd'],
  flagship: ['levelMarkupByClass.flagship'],
}

/** Form field of a Payload error path ("levelMarkupByClass.fullhd" → "fullhd"), if any. */
export function fieldOfPath(path: string): FieldName | undefined {
  return FIELD_NAMES.find((name) => PATHS[name].includes(path))
}

function get(s: PricingForm, path: string): number {
  const [a, b] = path.split('.') as [keyof PricingForm, string?]
  const v = s[a]
  return typeof v === 'number' ? v : (v as Record<string, number>)[b!]!
}

function set(s: PricingForm, path: string, value: number): void {
  const [a, b] = path.split('.') as [keyof PricingForm, string?]
  if (b) (s[a] as Record<string, number>)[b] = value
  else (s as Record<string, unknown>)[a] = value
}

/**
 * Keep what the person did not change exactly as stored. The form shows at most 2 decimals; a
 * value with more precision (typed in the Payload data list, e.g. 0.16667) would otherwise be
 * rounded by "Zapisz zmiany" and quietly move the proposed prices. A field counts as unchanged
 * when its submitted text equals what the form showed for the stored value.
 */
export function keepUnchanged(
  parsed: PricingForm,
  stored: PricingForm,
  submitted: Partial<Record<string, unknown>>,
): PricingForm {
  const shown = toFormValues(stored)
  const out: PricingForm = structuredClone(parsed)
  for (const name of FIELD_NAMES) {
    const text = typeof submitted[name] === 'string' ? submitted[name].trim() : ''
    if (text !== shown[name]) continue
    for (const path of PATHS[name]) set(out, path, get(stored, path))
  }
  return out
}
