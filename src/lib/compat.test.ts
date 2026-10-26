import { describe, expect, it } from 'vitest'

import expected from '../../tests/fixtures/pricing-expected.json'
import { checkCompat, COMPAT_ERRORS, compatMessage, indexOffer, resolveParts } from './compat'
import { seedCatalog } from './pricing/testing/seedCatalog'

const catalog = seedCatalog()
const index = indexOffer(catalog.levels, catalog.options)

describe('compatibility rules (ADR-G002 §5)', () => {
  it.each(expected.scenarios)('$name', (scenario) => {
    const parts = resolveParts(scenario.config, index)
    expect(parts).not.toBeNull()
    const result = checkCompat(parts!)
    // Fixtures list every broken rule in the order of the ADR table.
    expect(result.errors).toEqual(scenario.errors)
    expect(result.warnings).toEqual(scenario.warnings)
  })

  it('every build is compatible', () => {
    for (const build of expected.builds) {
      const parts = resolveParts(build.config, index)
      expect(checkCompat(parts!), build.slug).toEqual({ errors: [], warnings: [] })
    }
  })

  it('errors keep the order of the ADR table', () => {
    const parts = resolveParts(
      { level: 'P16', case: 'VEN2A', cooler: 'T102', ram: 'R16D4', ssd: 'PXL512' },
      index,
    )!
    const { errors } = checkCompat(parts)
    expect(errors.length).toBeGreaterThan(3)
    const positions = errors.map((e) => COMPAT_ERRORS.indexOf(e))
    expect(positions).toEqual([...positions].sort((a, b) => a - b))
  })

  it('a cooler without a height fails the "too tall" rule instead of passing silently', () => {
    const parts = resolveParts(expected.builds[0]!.config, index)!
    const result = checkCompat({ ...parts, cooler: { ...parts.cooler, heightMm: null } })
    expect(result.errors).toContain('cooler_too_tall')
  })
})

describe('resolveParts', () => {
  const config = expected.builds[0]!.config

  it('returns null for an unknown code or an option in the wrong slot', () => {
    expect(resolveParts({ ...config, ram: 'NOPE' }, index)).toBeNull()
    expect(resolveParts({ ...config, ram: config.cooler }, index)).toBeNull()
    expect(resolveParts({ ...config, level: 'P99' }, index)).toBeNull()
  })
})

describe('compatMessage', () => {
  const level = index.level.get('P13')!

  it('fills in the level details', () => {
    expect(compatMessage('ram_too_small', level)).toBe(
      `Za mało pamięci do tego poziomu (min. ${level.minRamGb} GB)`,
    )
    expect(compatMessage('ram_type', level)).toBe(`Ten poziom używa pamięci ${level.ramType}`)
  })

  it('has a message for every error and the warning', () => {
    for (const code of [...COMPAT_ERRORS, 'thick_radiator_top_only'] as const) {
      expect(compatMessage(code, level)).not.toBe('')
    }
  })
})
