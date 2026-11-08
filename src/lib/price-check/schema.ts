import { z } from 'zod'

/**
 * The answer of one offer reading (ADR-G007 §3, 1:1). Shop pages are data: Claude returns only
 * this JSON and the code validates it — nothing else from the page reaches the panel.
 */
export const readingSchema = z.object({
  url: z.string().max(1000),
  shop: z.string().max(200),
  title: z.string().max(500),
  matches: z.boolean(),
  price_pln: z.number().positive().max(1_000_000).nullable(),
  available: z.boolean(),
  cited_text: z.string().max(200),
  reason: z.string().max(500),
})
export type Reading = z.infer<typeof readingSchema>

/** Search proposals: offer pages of the item in the allowed shops (one per shop). */
export const searchSchema = z.object({
  // More than 10 is cut, not refused: the search is paid already.
  urls: z.array(z.string().max(1000)).transform((urls) => urls.slice(0, 10)),
})
export type SearchResult = z.infer<typeof searchSchema>

export type Parsed<T> = { ok: true; value: T } | { ok: false; reason: 'no_json' | 'invalid' }

/**
 * The JSON object of a model's text answer (the last `{…}` span, so a sentence before it does not
 * matter), validated with the schema. Never throws.
 */
export function parseAnswer<T>(text: string, schema: z.ZodType<T>): Parsed<T> {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end <= start) return { ok: false, reason: 'no_json' }
  let raw: unknown
  try {
    raw = JSON.parse(text.slice(start, end + 1))
  } catch {
    return { ok: false, reason: 'invalid' }
  }
  const parsed = schema.safeParse(raw)
  return parsed.success ? { ok: true, value: parsed.data } : { ok: false, reason: 'invalid' }
}
