import type { Field, GlobalConfig, NumberField } from 'payload'

import { adminOnly } from '../access/panel'
import { GROUP_OFFER } from '../collections/shared'

const share = (name: string, label: string, max = 1): Field => ({
  name,
  label,
  type: 'number',
  required: true,
  min: 0,
  max,
})

const zl = (name: string, label: string, min = 0): Field => ({
  name,
  label,
  type: 'number',
  required: true,
  min,
})

/**
 * Panel spec §2 and §13: below it a build is marked yellow (warn), below `minMargin` red. A share
 * like `minMargin`; only the panel reads it — prices do not depend on it.
 */
const warnMargin: NumberField = {
  name: 'warnMargin',
  label: 'Ostrzeżenie o marży (np. 0,12)',
  type: 'number',
  required: true,
  min: 0,
  max: 0.5,
  defaultValue: 0.12,
  validate: (value, { siblingData }) => {
    const min = (siblingData as { minMargin?: unknown }).minMargin
    if (typeof value !== 'number' || typeof min !== 'number') return true
    return value >= min || 'Próg ostrzeżenia nie może być niższy niż minimalna marża.'
  },
}

/**
 * Pricing rules (ADR-G002 §2). Markups reveal margins, so the whole global is panel-only — the
 * site never reads it; it reads published prices.
 */
export const PricingSettings: GlobalConfig = {
  slug: 'pricing-settings',
  label: 'Ustawienia cen',
  admin: { group: GROUP_OFFER },
  access: { read: adminOnly, update: adminOnly },
  fields: [
    {
      type: 'row',
      fields: [
        // ≤ 0.5: at 1 the markup floor m / (1 − m) is infinite (lib/pricing/cost.ts).
        share('minMargin', 'Minimalna marża (np. 0,11)', 0.5),
        warnMargin,
        share('publishThreshold', 'Próg zmiany do zatwierdzenia (np. 0,03)'),
        {
          // Publication is always manual (panel spec §0 pt 3, §13; P1): the margin alarm no longer
          // publishes anything, whatever is stored here. Kept in the database only to read.
          name: 'autoPublish',
          label: 'Publikuj bez zatwierdzania (wyłączone — publikacja zawsze ręczna)',
          type: 'checkbox',
          defaultValue: false,
          access: { create: () => false, update: () => false },
          admin: { readOnly: true },
        },
      ],
    },
    {
      type: 'row',
      fields: [
        zl('serviceCost', 'Koszt usługi (zł): Windows, wysyłka i opakowanie'),
        zl('caseCoolerBuffer', 'Bufor obudów i chłodzeń (zł)'),
        zl('whiteSurcharge', 'Dopłata za biały poziom (zł)'),
        // ≥ 1: prices are rounded up to a multiple of it; 0 cannot round anything.
        zl('roundingStep', 'Krok zaokrąglenia (zł)', 1),
      ],
    },
    {
      name: 'categoryMarkup',
      label: 'Narzut kategorii',
      type: 'group',
      fields: [
        {
          type: 'row',
          fields: [
            share('case', 'Obudowa'),
            share('cooler', 'Chłodzenie'),
            share('ram', 'RAM'),
            share('ssd', 'Dysk'),
            share('service', 'Usługa'),
          ],
        },
      ],
    },
    {
      name: 'levelMarkupByClass',
      label: 'Narzut poziomu wg klasy',
      type: 'group',
      admin: { description: 'Klucze = „Klasa narzutu” poziomu mocy.' },
      fields: [
        {
          type: 'row',
          fields: [
            share('fullhd', 'FullHD'),
            share('qhd', '2K'),
            share('uhd', '4K'),
            share('flagship', 'Flagowiec'),
          ],
        },
      ],
    },
  ],
}
