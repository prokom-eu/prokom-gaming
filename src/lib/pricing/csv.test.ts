import { describe, expect, it } from 'vitest'

import { MAX_ROWS, matchCosts, parseCost, parseCostCsv, previewCostImport } from './csv'
import type { ImportLevel, ImportOption } from './csv'

describe('parseCost', () => {
  it('reads Polish and plain amounts', () => {
    expect(parseCost('1 234,56')).toBe(1234.56)
    expect(parseCost('1 234,5')).toBe(1234.5)
    expect(parseCost('999')).toBe(999)
    expect(parseCost('1234.50')).toBe(1234.5)
    expect(parseCost('450 zł')).toBe(450)
  })

  it('rejects what is not a positive amount', () => {
    for (const bad of ['', 'abc', '0', '-5', '12,345', '1.2.3', '1 000 000', '1e3']) {
      expect(parseCost(bad), bad).toBeNull()
    }
  })
})

describe('parseCostCsv', () => {
  it('reads ; and tab separated rows, skips blank lines and a header', () => {
    const { rows, errors } = parseCostCsv(
      'kod;koszt\nR16;450\n\nKRAKEN\t1 199,99\r\nP01-GPU; 2000 ;\n',
    )
    expect(errors).toEqual([])
    expect(rows).toEqual([
      { line: 2, key: 'R16', cost: 450 },
      { line: 4, key: 'KRAKEN', cost: 1199.99 },
      { line: 5, key: 'P01-GPU', cost: 2000 },
    ])
  })

  it('a first data line with a bad cost is an error, not a header', () => {
    const { rows, errors } = parseCostCsv('R16;45O\nR32;900')
    expect(rows).toEqual([{ line: 2, key: 'R32', cost: 900 }])
    expect(errors).toEqual([{ line: 1, text: 'R16;45O', message: 'Nieprawidłowy koszt „45O”.' }])
  })

  it('reports wrong columns, missing keys and repeated keys (case-insensitive)', () => {
    const { rows, errors } = parseCostCsv('R16;450\nR32\n;300\nr16;460\nA;1;2')
    expect(rows).toEqual([{ line: 1, key: 'R16', cost: 450 }])
    expect(errors.map((e) => [e.line, e.message])).toEqual([
      [2, 'Oczekuję dwóch kolumn: kod lub EAN; koszt.'],
      [3, 'Brak kodu albo EAN.'],
      [4, 'Powtórzony kod (pierwszy raz w wierszu 1).'],
      [5, 'Oczekuję dwóch kolumn: kod lub EAN; koszt.'],
    ])
  })

  it('refuses a file over the row limit', () => {
    const big = Array.from({ length: MAX_ROWS + 1 }, (_, i) => `K${i};10`).join('\n')
    expect(parseCostCsv(big).errors[0]!.message).toContain('Za dużo wierszy')
  })
})

const options: ImportOption[] = [
  { id: 1, code: 'R16', ean: '5901234567890', cost: 400, publicLabel: '16 GB DDR5' },
  { id: 2, code: 'KRAKEN', ean: null, cost: 1100, publicLabel: 'NZXT Kraken 360' },
  { id: 3, code: 'DUP1', ean: '1111111111111', cost: 10, publicLabel: 'A' },
  { id: 4, code: 'DUP2', ean: '1111111111111', cost: 10, publicLabel: 'B' },
]
const levels: ImportLevel[] = [
  {
    id: 10,
    code: 'P01',
    components: [
      { role: 'cpu', internalModel: 'Ryzen 5 5500', ean: null, cost: 300 },
      { role: 'gpu', internalModel: 'RTX 5060 8GB Dual', ean: '2222222222222', cost: 1300 },
    ],
  },
  {
    id: 11,
    code: 'P02',
    components: [{ role: 'cpu', internalModel: 'Ryzen 5 5500', ean: null, cost: 300 }],
  },
]

describe('matchCosts', () => {
  const row = (key: string, cost: number, line = 1) => ({ line, key, cost })

  it('matches an option by code, case-insensitively', () => {
    const { changes } = matchCosts([row('kraken', 1150)], options, levels)
    expect(changes).toEqual([
      {
        line: 1,
        key: 'kraken',
        matchedBy: 'code',
        newCost: 1150,
        targets: [
          { kind: 'option', id: 2, code: 'KRAKEN', label: 'NZXT Kraken 360', oldCost: 1100 },
        ],
      },
    ])
  })

  it('matches by EAN: an option or a level part', () => {
    const { changes } = matchCosts(
      [row('5901234567890', 410, 1), row('2222222222222', 1350, 2)],
      options,
      levels,
    )
    expect(changes.map((c) => [c.matchedBy, c.targets[0]!.kind])).toEqual([
      ['ean', 'option'],
      ['ean', 'component'],
    ])
  })

  it('a part model updates every level that uses it', () => {
    const { changes } = matchCosts([row('ryzen 5 5500', 320)], options, levels)
    expect(changes[0]!.matchedBy).toBe('model')
    expect(changes[0]!.targets).toEqual([
      expect.objectContaining({
        kind: 'component',
        id: 10,
        levelCode: 'P01',
        index: 0,
        oldCost: 300,
      }),
      expect.objectContaining({
        kind: 'component',
        id: 11,
        levelCode: 'P02',
        index: 0,
        oldCost: 300,
      }),
    ])
  })

  it('counts rows with the same cost and refuses unknown and ambiguous keys', () => {
    const result = matchCosts(
      [row('R16', 400, 1), row('NOPE', 5, 2), row('1111111111111', 12, 3)],
      options,
      levels,
    )
    expect(result.changes).toEqual([])
    expect(result.unchanged).toBe(1)
    expect(result.errors.map((e) => [e.line, e.message])).toEqual([
      [2, 'Nie znam tego kodu, EAN ani modelu części.'],
      [3, 'Ten EAN ma kilka różnych pozycji.'],
    ])
  })
})

describe('two rows for the same place', () => {
  const row = (key: string, cost: number, line: number) => ({ line, key, cost })

  it("an option's code and its EAN: the second row is an error, not an overwrite", () => {
    const result = matchCosts([row('R16', 410, 1), row('5901234567890', 420, 2)], options, levels)
    expect(result.changes.map((c) => [c.line, c.newCost])).toEqual([[1, 410]])
    expect(result.errors).toEqual([
      {
        line: 2,
        text: '5901234567890',
        message: 'Ta sama pozycja co w wierszu 1 — zostaw jeden wiersz.',
      },
    ])
  })

  it("a part's EAN and its model", () => {
    const result = matchCosts(
      [row('2222222222222', 1350, 1), row('RTX 5060 8GB Dual', 1400, 2)],
      options,
      levels,
    )
    expect(result.changes.map((c) => c.line)).toEqual([1])
    expect(result.errors.map((e) => [e.line, e.message])).toEqual([
      [2, 'Ta sama pozycja co w wierszu 1 — zostaw jeden wiersz.'],
    ])
  })

  it('also when the first row does not change the cost', () => {
    const result = matchCosts([row('R16', 400, 1), row('5901234567890', 420, 2)], options, levels)
    expect(result.unchanged).toBe(1)
    expect(result.errors.map((e) => e.line)).toEqual([2])
  })
})

describe('previewCostImport', () => {
  it('joins parse and match errors in line order', () => {
    const preview = previewCostImport('NOPE;5\nR16;x\nR16;420', options, levels)
    expect(preview.changes.map((c) => c.key)).toEqual(['R16'])
    expect(preview.errors.map((e) => e.line)).toEqual([1, 2])
  })
})
