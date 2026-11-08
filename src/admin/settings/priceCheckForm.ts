import { z } from 'zod'

/**
 * Section „Sprawdzanie cen” of /admin/ustawienia (panel spec §13, board Ustawienia): the
 * `price-check-settings` fields as typed (percent as whole numbers, like the board). Pure: the
 * view fills the form with `toPriceCheckValues()`, the action parses with `parsePriceCheckForm()`.
 * Shops and competitors are edited in the global's form (lists).
 */

export const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const
export type DayKey = (typeof DAY_KEYS)[number]

export type PriceCheckForm = {
  days: DayKey[]
  hour: number
  costMethod: 'lowest' | 'avg2'
  outlierPct: number
  alertChangePct: number
  monthlyBudgetUsd: number
  alertMinMargin: boolean
  alertUnavailable: boolean
}

export type PriceCheckValues = {
  days: DayKey[]
  hour: string
  costMethod: 'lowest' | 'avg2'
  outlierPct: string
  alertChangePct: string
  monthlyBudgetUsd: string
  alertMinMargin: boolean
  alertUnavailable: boolean
}

export type PriceCheckFieldErrors = Partial<
  Record<'hour' | 'outlierPct' | 'alertChangePct' | 'monthlyBudgetUsd' | 'days', string>
>

const pct = (v: number) => String(Math.round(v * 1000) / 10).replace('.', ',')

export function toPriceCheckValues(s: Partial<PriceCheckForm>): PriceCheckValues {
  return {
    days: (s.days ?? ['mon', 'fri']).filter((d): d is DayKey => DAY_KEYS.includes(d)),
    hour: String(s.hour ?? 6),
    costMethod: s.costMethod ?? 'lowest',
    outlierPct: pct(s.outlierPct ?? 0.25),
    alertChangePct: pct(s.alertChangePct ?? 0.05),
    monthlyBudgetUsd: String(s.monthlyBudgetUsd ?? 20).replace('.', ','),
    alertMinMargin: s.alertMinMargin ?? true,
    alertUnavailable: s.alertUnavailable ?? true,
  }
}

const decimal = (min: number, max: number) =>
  z
    .string()
    .trim()
    .regex(/^\d{1,4}([.,]\d{1,2})?$/, 'Wpisz liczbę.')
    .transform((v) => Number(v.replace(',', '.')))
    .refine((v) => v >= min && v <= max, `Od ${min} do ${max}.`)

const schema = z.object({
  hour: z
    .string()
    .trim()
    .regex(/^\d{1,2}$/, 'Wpisz godzinę 0–23.')
    .transform(Number)
    .refine((v) => v >= 0 && v <= 23, 'Wpisz godzinę 0–23.'),
  costMethod: z.enum(['lowest', 'avg2']),
  outlierPct: decimal(1, 500),
  alertChangePct: decimal(0, 100),
  monthlyBudgetUsd: decimal(0, 1000),
})

export function parsePriceCheckForm(
  form: Record<string, FormDataEntryValue | FormDataEntryValue[]>,
): { ok: true; data: PriceCheckForm } | { ok: false; errors: PriceCheckFieldErrors } {
  const one = (k: string) => {
    const v = form[k]
    return typeof v === 'string' ? v : ''
  }
  const parsed = schema.safeParse({
    hour: one('hour'),
    costMethod: one('costMethod'),
    outlierPct: one('outlierPct'),
    alertChangePct: one('alertChangePct'),
    monthlyBudgetUsd: one('monthlyBudgetUsd'),
  })
  const daysRaw = form.days
  const days = (Array.isArray(daysRaw) ? daysRaw : daysRaw ? [daysRaw] : []).filter(
    (d): d is DayKey => typeof d === 'string' && (DAY_KEYS as readonly string[]).includes(d),
  )
  if (!parsed.success) {
    const errors: PriceCheckFieldErrors = {}
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof PriceCheckFieldErrors
      errors[key] ??= issue.message
    }
    return { ok: false, errors }
  }
  return {
    ok: true,
    data: {
      days,
      hour: parsed.data.hour,
      costMethod: parsed.data.costMethod,
      outlierPct: parsed.data.outlierPct / 100,
      alertChangePct: parsed.data.alertChangePct / 100,
      monthlyBudgetUsd: parsed.data.monthlyBudgetUsd,
      alertMinMargin: form.alertMinMargin === 'on',
      alertUnavailable: form.alertUnavailable === 'on',
    },
  }
}
