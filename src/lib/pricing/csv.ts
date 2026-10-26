import 'server-only'

/**
 * Cost import from a wholesaler CSV (ADR-G002 §4.1): `kod lub EAN; koszt`. Pure functions — the
 * panel shows the preview, `store.ts` writes it. Server-only: works on costs.
 *
 * Matching, first hit wins (Krystian's decision, 26.10.2026):
 * 1. option code (`R16`, `KRAKEN`),
 * 2. EAN of an option or a power-level part,
 * 3. `internalModel` of a power-level part — one model updates every level that uses it.
 */

export const MAX_ROWS = 2000

export type ParsedRow = { line: number; key: string; cost: number }
export type RowError = { line: number; text: string; message: string }

/** Parse the pasted text. A first line whose cost is not a number is taken as a header. */
export function parseCostCsv(text: string): { rows: ParsedRow[]; errors: RowError[] } {
  const rows: ParsedRow[] = []
  const errors: RowError[] = []
  const seen = new Map<string, number>()
  const lines = text.split(/\r?\n/)
  let firstLine = true

  if (lines.filter((l) => l.trim() !== '').length > MAX_ROWS) {
    return {
      rows: [],
      errors: [{ line: 0, text: '', message: `Za dużo wierszy (maks. ${MAX_ROWS}).` }],
    }
  }

  lines.forEach((raw, index) => {
    const line = index + 1
    const text = raw.trim()
    if (text === '') return
    const isFirst = firstLine
    firstLine = false
    const cells = text.split(/[;\t]/).map((c) => c.trim())
    while (cells.length > 2 && cells[cells.length - 1] === '') cells.pop() // trailing separator
    if (cells.length !== 2) {
      errors.push({ line, text, message: 'Oczekuję dwóch kolumn: kod lub EAN; koszt.' })
      return
    }
    const [key, costText] = cells as [string, string]
    const cost = parseCost(costText)
    if (cost === null) {
      // Header: only the first non-empty line, and only when the cost column holds words and no
      // digits ("koszt") — a typo like "45O" stays an error.
      if (isFirst && /\p{L}/u.test(costText) && !/\d/.test(costText)) return
      errors.push({ line, text, message: `Nieprawidłowy koszt „${costText}”.` })
      return
    }
    if (key === '') {
      errors.push({ line, text, message: 'Brak kodu albo EAN.' })
      return
    }
    const normalized = normalizeKey(key)
    const first = seen.get(normalized)
    if (first !== undefined) {
      errors.push({ line, text, message: `Powtórzony kod (pierwszy raz w wierszu ${first}).` })
      return
    }
    seen.set(normalized, line)
    rows.push({ line, key, cost })
  })
  return { rows, errors }
}

/** `1 234,56`, `1234.5`, `999` → number; `null` when not a positive amount under 1 000 000 zł. */
export function parseCost(text: string): number | null {
  const compact = text.replace(/[\s ]/g, '').replace(/zł$/i, '').replace(',', '.')
  if (!/^\d+(\.\d{1,2})?$/.test(compact)) return null
  const value = Number(compact)
  return value > 0 && value < 1_000_000 ? value : null
}

const normalizeKey = (key: string) => key.trim().toUpperCase()

// --- Matching against the offer ---

export type ImportOption = {
  id: number
  code: string
  ean?: string | null
  cost: number
  publicLabel: string
}
export type ImportLevel = {
  id: number
  code: string
  components?: { role: string; internalModel: string; ean?: string | null; cost: number }[] | null
}

export type CostTarget =
  | { kind: 'option'; id: number; code: string; label: string; oldCost: number }
  | {
      kind: 'component'
      id: number
      levelCode: string
      index: number
      role: string
      model: string
      oldCost: number
    }

export type CostChange = {
  line: number
  key: string
  matchedBy: 'code' | 'ean' | 'model'
  newCost: number
  /** Every place the cost goes to (a shared part: several levels). */
  targets: CostTarget[]
}

export type ImportPreview = {
  changes: CostChange[]
  /** Matched rows whose cost is already the same. */
  unchanged: number
  errors: RowError[]
}

/** Match parsed rows to options and level parts. Unmatched rows are errors. */
export function matchCosts(
  rows: readonly ParsedRow[],
  options: readonly ImportOption[],
  levels: readonly ImportLevel[],
): ImportPreview {
  const byCode = new Map(options.map((o) => [normalizeKey(o.code), o]))
  const parts = levels.flatMap((level) =>
    (level.components ?? []).map((c, index) => ({ level, c, index })),
  )
  const optionTarget = (o: ImportOption): CostTarget => ({
    kind: 'option',
    id: o.id,
    code: o.code,
    label: o.publicLabel,
    oldCost: o.cost,
  })
  const partTarget = (p: (typeof parts)[number]): CostTarget => ({
    kind: 'component',
    id: p.level.id,
    levelCode: p.level.code,
    index: p.index,
    role: p.c.role,
    model: p.c.internalModel,
    oldCost: p.c.cost,
  })

  const changes: CostChange[] = []
  const errors: RowError[] = []
  let unchanged = 0
  for (const row of rows) {
    const key = normalizeKey(row.key)
    let matchedBy: CostChange['matchedBy']
    let targets: CostTarget[]

    const option = byCode.get(key)
    const eanOptions = options.filter((o) => o.ean && o.ean.trim() === row.key.trim())
    const eanParts = parts.filter((p) => p.c.ean && p.c.ean.trim() === row.key.trim())
    if (option) {
      matchedBy = 'code'
      targets = [optionTarget(option)]
    } else if (eanOptions.length + eanParts.length > 0) {
      if (eanOptions.length > 1 || (eanOptions.length === 1 && eanParts.length > 0)) {
        errors.push({ line: row.line, text: row.key, message: 'Ten EAN ma kilka różnych pozycji.' })
        continue
      }
      matchedBy = 'ean'
      targets = eanOptions.length === 1 ? [optionTarget(eanOptions[0]!)] : eanParts.map(partTarget)
    } else {
      const byModel = parts.filter((p) => normalizeKey(p.c.internalModel) === key)
      if (byModel.length === 0) {
        errors.push({
          line: row.line,
          text: row.key,
          message: 'Nie znam tego kodu, EAN ani modelu części.',
        })
        continue
      }
      matchedBy = 'model'
      targets = byModel.map(partTarget)
    }

    const changed = targets.filter((t) => t.oldCost !== row.cost)
    if (changed.length === 0) {
      unchanged++
      continue
    }
    changes.push({ line: row.line, key: row.key, matchedBy, newCost: row.cost, targets: changed })
  }
  return { changes, unchanged, errors }
}

/** Parse and match in one go: what the panel previews and what is written after confirming. */
export function previewCostImport(
  text: string,
  options: readonly ImportOption[],
  levels: readonly ImportLevel[],
): ImportPreview {
  const parsed = parseCostCsv(text)
  const matched = matchCosts(parsed.rows, options, levels)
  return {
    changes: matched.changes,
    unchanged: matched.unchanged,
    errors: [...parsed.errors, ...matched.errors].sort((a, b) => a.line - b.line),
  }
}
