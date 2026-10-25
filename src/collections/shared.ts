import type { Validate } from 'payload'

// Panel groups (spec. §22).
export const GROUP_OFFER = 'Oferta'
export const GROUP_CONTENT = 'Treści'
export const GROUP_ADMIN = 'Administracja'

export const RESOLUTIONS = [
  { label: 'FullHD', value: 'fullhd' },
  { label: '2K', value: 'qhd' },
  { label: '4K', value: 'uhd' },
]

export const RAM_TYPES = [
  { label: 'DDR4', value: 'DDR4' },
  { label: 'DDR5', value: 'DDR5' },
]

// Markup class of a power level = key of `pricing-settings.levelMarkupByClass` (ADR-G002 §2).
export const MARKUP_CLASSES = [
  { label: 'FullHD', value: 'fullhd' },
  { label: '2K', value: 'qhd' },
  { label: '4K', value: 'uhd' },
  { label: 'Flagowiec', value: 'flagship' },
]

export const PRICE_ITEM_TYPES = [
  { label: 'Poziom mocy', value: 'level' },
  { label: 'Opcja', value: 'option' },
  { label: 'Usługa', value: 'service' },
  { label: 'Cena od (poziom)', value: 'level_from' },
]

/**
 * Required only for some option types (the field is hidden for the others). A custom `validate`
 * replaces Payload's own, so the field's default validator (`number`, `select` from
 * `payload/shared`: min, max, allowed values) runs after the check.
 */
export function requiredFor<TValue, TField extends object>(
  types: readonly string[],
  base: Validate<TValue, unknown, unknown, TField>,
): Validate<TValue, unknown, unknown, TField> {
  return (value, options) => {
    const type = (options.siblingData as { type?: string }).type
    if (type && types.includes(type) && (value === null || value === undefined || value === '')) {
      return 'To pole jest wymagane dla tego typu opcji.'
    }
    return base(value, options)
  }
}
