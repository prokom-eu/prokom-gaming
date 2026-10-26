import type { Field, GlobalConfig } from 'payload'

import { panelOnly } from '../access/panel'
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
 * Pricing rules (ADR-G002 §2). Markups reveal margins, so the whole global is panel-only — the
 * site never reads it; it reads published prices.
 */
export const PricingSettings: GlobalConfig = {
  slug: 'pricing-settings',
  label: 'Ustawienia cen',
  admin: { group: GROUP_OFFER },
  access: { read: panelOnly, update: panelOnly },
  fields: [
    {
      type: 'row',
      fields: [
        // ≤ 0.5: at 1 the markup floor m / (1 − m) is infinite (lib/pricing/cost.ts).
        share('minMargin', 'Minimalna marża (np. 0,11)', 0.5),
        share('publishThreshold', 'Próg zmiany do zatwierdzenia (np. 0,03)'),
        {
          name: 'autoPublish',
          label: 'Publikuj bez zatwierdzania',
          type: 'checkbox',
          defaultValue: false,
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
