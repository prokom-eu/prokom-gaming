/**
 * Reply templates of the inquiry inbox (panel spec §4): `{nr}`, `{zestaw}`, `{cena}`, `{czesci}`,
 * `{termin}`, `{podpis}`. Pure and browser-safe — the panel fills a template into the reply box,
 * the send action checks the final text again.
 */

export const TEMPLATE_VARS = ['nr', 'zestaw', 'cena', 'czesci', 'termin', 'podpis'] as const
export type TemplateVar = (typeof TEMPLATE_VARS)[number]

/** `null` or blank = not known for this inquiry (e.g. `{cena}` of a question without a computer). */
export type TemplateValues = Partial<Record<TemplateVar, string | null>>

const PLACEHOLDER = /\{([a-z_]+)\}/g
const isVar = (name: string): name is TemplateVar =>
  (TEMPLATE_VARS as readonly string[]).includes(name)

/**
 * Fills the known variables. A variable without a value stays as `{name}` and is listed in
 * `missing`, so the panel can block sending. Other braces (`{nr_zam}` of the stage template —
 * filled in P5) are left untouched.
 */
export function renderTemplate(
  body: string,
  values: TemplateValues,
): { text: string; missing: TemplateVar[] } {
  const missing = new Set<TemplateVar>()
  const text = body.replace(PLACEHOLDER, (match, name: string) => {
    if (!isVar(name)) return match
    const value = values[name]?.trim()
    if (!value) {
      missing.add(name)
      return match
    }
    return value
  })
  return { text, missing: [...missing] }
}

/** Known variables still in a text — a reply with any of them is not sent. */
export function placeholdersIn(text: string): TemplateVar[] {
  const found = new Set<TemplateVar>()
  for (const [, name] of text.matchAll(PLACEHOLDER)) {
    if (name && isVar(name)) found.add(name)
  }
  return [...found]
}

/** `{czesci}`: one part per line, as on the Zapytania board („• model”). Empty list = unknown. */
export function partsList(models: readonly string[]): string | null {
  const lines = models.map((model) => model.trim()).filter(Boolean)
  return lines.length === 0 ? null : lines.map((model) => `• ${model}`).join('\n')
}
