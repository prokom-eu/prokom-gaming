import type { FieldHook, Validate } from 'payload'

import { normalizeEmail } from '../lib/email'
import { KIND_PRIORITY, SOURCES } from '../lib/fps'

// Panel groups (spec. §22).
export const GROUP_OFFER = 'Oferta'
export const GROUP_CONTENT = 'Treści'
export const GROUP_ADMIN = 'Administracja'
export const GROUP_GAMES = 'Gry i klatki'
export const GROUP_SALES = 'Sprzedaż'
export const GROUP_WORKSHOP = 'Warsztat'

/** Field hook: e-mail trimmed and lower case on every write (panel spec §6, `lib/email.ts`). */
export const normalizeEmailHook: FieldHook = ({ value }) => normalizeEmail(value)

export const RESOLUTIONS = [
  { label: 'FullHD', value: 'fullhd' },
  { label: '2K', value: 'qhd' },
  { label: '4K', value: 'uhd' },
]

// Kind of an FPS number with its site label (ADR-G004 §2), in display priority order.
export const FPS_KINDS = KIND_PRIORITY.map((value) => ({ label: SOURCES[value].label, value }))

export const GAME_KINDS = [
  { label: 'E-sport', value: 'esport' },
  { label: 'AAA', value: 'aaa' },
  { label: 'Z limitem klatek', value: 'capped' },
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
  return requiredWhen((s) => types.includes(s.type ?? ''), base)
}

type Siblings = { type?: string; kind?: string }

/** Like `requiredFor`, for any condition on the sibling fields (e.g. cooler `kind`). */
export function requiredWhen<TValue, TField extends object>(
  isRequired: (siblings: Siblings) => boolean,
  base: Validate<TValue, unknown, unknown, TField>,
  message = 'To pole jest wymagane dla tego typu opcji.',
): Validate<TValue, unknown, unknown, TField> {
  return (value, options) => {
    const empty = value === null || value === undefined || value === ''
    if (empty && isRequired(options.siblingData as Siblings)) {
      return message
    }
    return base(value, options)
  }
}
