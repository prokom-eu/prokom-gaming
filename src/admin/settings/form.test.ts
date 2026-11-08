import { describe, expect, it } from 'vitest'

import seed from '../../../seed/prokomgaming/pricing-settings.json'
import {
  fieldOfPath,
  keepUnchanged,
  parseSettingsForm,
  percentText,
  toFormValues,
  type PricingForm,
} from './form'

const SEED: PricingForm = {
  minMargin: seed.minMargin,
  warnMargin: 0.12,
  publishThreshold: seed.publishThreshold,
  serviceCost: seed.serviceCost,
  caseCoolerBuffer: seed.caseCoolerBuffer,
  whiteSurcharge: seed.whiteSurcharge,
  roundingStep: seed.roundingStep,
  categoryMarkup: { ram: seed.categoryMarkup.ram, ssd: seed.categoryMarkup.ssd },
  levelMarkupByClass: {
    fullhd: seed.levelMarkupByClass.FullHD,
    qhd: seed.levelMarkupByClass['2K'],
    uhd: seed.levelMarkupByClass['4K'],
    flagship: seed.levelMarkupByClass.flagowiec,
  },
}

describe('settings form', () => {
  it('shows the seed values like the board: 11, 12, 17, 16, 14,5, 13,5, 15, 20, 300, 150, 10, 3', () => {
    expect(toFormValues(SEED)).toEqual({
      minMargin: '11',
      warnMargin: '12',
      fullhd: '17',
      qhd: '16',
      uhd: '14,5',
      flagship: '13,5',
      ramSsd: '15',
      caseCoolerBuffer: '20',
      whiteSurcharge: '300',
      serviceCost: '150',
      roundingStep: '10',
      publishThreshold: '3',
    })
  })

  it('round-trips the seed exactly — saving without changes changes no price', () => {
    const parsed = parseSettingsForm(toFormValues(SEED))
    expect(parsed).toEqual({ ok: true, data: SEED })
  })

  it('turns percent into shares without binary noise', () => {
    const parsed = parseSettingsForm({ ...toFormValues(SEED), uhd: '14,5', minMargin: '11.25' })
    expect(parsed.ok && parsed.data.levelMarkupByClass.uhd).toBe(0.145)
    expect(parsed.ok && parsed.data.minMargin).toBe(0.1125)
    expect(percentText(0.1125)).toBe('11,25')
  })

  it('writes the one RAM-and-disks field to both markups', () => {
    const parsed = parseSettingsForm({ ...toFormValues(SEED), ramSsd: '18' })
    expect(parsed.ok && parsed.data.categoryMarkup).toEqual({ ram: 0.18, ssd: 0.18 })
  })

  it('rejects text, negative numbers, too many decimals and empty fields', () => {
    const parsed = parseSettingsForm({
      ...toFormValues(SEED),
      fullhd: 'siedemnaście',
      qhd: '-16',
      uhd: '14,555',
      serviceCost: '',
    })
    expect(parsed.ok).toBe(false)
    if (parsed.ok) return
    expect(Object.keys(parsed.errors).sort()).toEqual(['fullhd', 'qhd', 'serviceCost', 'uhd'])
  })

  it('keeps the guard sane: minimum margin ≤ 50%, warning ≥ minimum, rounding ≥ 1 zł', () => {
    const parsed = parseSettingsForm({
      ...toFormValues(SEED),
      minMargin: '60',
      warnMargin: '10',
      roundingStep: '0',
    })
    expect(parsed.ok).toBe(false)
    if (parsed.ok) return
    expect(parsed.errors.minMargin).toBe('Najwyżej 50%.')
    expect(parsed.errors.roundingStep).toBe('Co najmniej 1 zł.')

    const lowWarn = parseSettingsForm({ ...toFormValues(SEED), warnMargin: '10' })
    expect(lowWarn.ok === false && lowWarn.errors.warnMargin).toBe(
      'Próg ostrzeżenia nie może być niższy niż minimalna marża.',
    )
  })

  it('keeps untouched stored values with more precision exactly as they are', () => {
    const stored: PricingForm = {
      ...SEED,
      serviceCost: 150.555,
      categoryMarkup: { ram: 0.15, ssd: 0.1666 },
      levelMarkupByClass: { ...SEED.levelMarkupByClass, qhd: 0.16667 },
    }
    const submitted = { ...toFormValues(stored), uhd: '15' } // only 4K changed
    const parsed = parseSettingsForm(submitted)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    const saved = keepUnchanged(parsed.data, stored, submitted)
    expect(saved.levelMarkupByClass.qhd).toBe(0.16667)
    expect(saved.serviceCost).toBe(150.555)
    // RAM-and-disks untouched: both stay as stored, also when they differ.
    expect(saved.categoryMarkup).toEqual({ ram: 0.15, ssd: 0.1666 })
    expect(saved.levelMarkupByClass.uhd).toBe(0.15)
  })

  it('maps Payload error paths back to the form fields', () => {
    expect(fieldOfPath('levelMarkupByClass.fullhd')).toBe('fullhd')
    expect(fieldOfPath('categoryMarkup.ssd')).toBe('ramSsd')
    expect(fieldOfPath('warnMargin')).toBe('warnMargin')
    expect(fieldOfPath('autoPublish')).toBeUndefined()
  })
})
