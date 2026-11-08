import { z } from 'zod'

/**
 * Section „Zapytania i poczta” of /admin/ustawienia (panel spec §13, board Ustawienia): the
 * `mail-settings` fields as typed. Pure: the view fills the form with `toMailFormValues()`, the
 * action parses with `parseMailForm()`; Payload validates again on save.
 */

export type MailForm = {
  replyHours: { from: number; to: number }
  replySlaMinutes: number
  replyAlarmMinutes: number
  signature: string
}

export const MAIL_FIELDS = [
  'from',
  'to',
  'replySlaMinutes',
  'replyAlarmMinutes',
  'signature',
] as const
export type MailFieldName = (typeof MAIL_FIELDS)[number]
export type MailFormValues = Record<MailFieldName, string>
export type MailFieldErrors = Partial<Record<MailFieldName, string>>

export function toMailFormValues(s: MailForm): MailFormValues {
  return {
    from: String(s.replyHours.from),
    to: String(s.replyHours.to),
    replySlaMinutes: String(s.replySlaMinutes),
    replyAlarmMinutes: String(s.replyAlarmMinutes),
    signature: s.signature,
  }
}

const whole = (min: number, max: number) =>
  z
    .string()
    .trim()
    .regex(/^\d{1,4}$/, 'Wpisz liczbę całkowitą.')
    .transform(Number)
    .refine((v) => v >= min && v <= max, `Od ${min} do ${max}.`)

const schema = z
  .object({
    from: whole(0, 24),
    to: whole(0, 24),
    replySlaMinutes: whole(5, 24 * 60),
    replyAlarmMinutes: whole(5, 24 * 60),
    signature: z
      .string()
      .transform((v) => v.replace(/\r\n/g, '\n').trim())
      .pipe(z.string().min(1, 'Wpisz podpis.').max(500, 'Najwyżej 500 znaków.')),
  })
  .superRefine((v, ctx) => {
    if (v.to <= v.from) {
      ctx.addIssue({
        code: 'custom',
        path: ['to'],
        message: 'Godzina końca musi być późniejsza niż początku.',
      })
    }
  })

export function parseMailForm(
  raw: Partial<Record<string, unknown>>,
): { ok: true; data: MailForm } | { ok: false; errors: MailFieldErrors } {
  const input = Object.fromEntries(
    MAIL_FIELDS.map((name) => [name, typeof raw[name] === 'string' ? raw[name] : '']),
  )
  const parsed = schema.safeParse(input)
  if (!parsed.success) {
    const errors: MailFieldErrors = {}
    for (const issue of parsed.error.issues) {
      const field = issue.path[0] as MailFieldName
      errors[field] ??= issue.message
    }
    return { ok: false, errors }
  }
  const { from, to, replySlaMinutes, replyAlarmMinutes, signature } = parsed.data
  return {
    ok: true,
    data: { replyHours: { from, to }, replySlaMinutes, replyAlarmMinutes, signature },
  }
}

/** Form field of a Payload error path („replyHours.to” → „to”), if any. */
export function mailFieldOfPath(path: string): MailFieldName | undefined {
  const last = path.split('.').pop() ?? ''
  return (MAIL_FIELDS as readonly string[]).includes(last) ? (last as MailFieldName) : undefined
}
