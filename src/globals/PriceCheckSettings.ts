import type { GlobalConfig } from 'payload'

import { adminOnly } from '../access/panel'
import { GROUP_OFFER } from '../collections/shared'
import { DEFAULT_SHOPS } from '../lib/pricing/sources'

export const CHECK_DAYS = [
  { label: 'poniedziałek', value: 'mon' },
  { label: 'wtorek', value: 'tue' },
  { label: 'środa', value: 'wed' },
  { label: 'czwartek', value: 'thu' },
  { label: 'piątek', value: 'fri' },
  { label: 'sobota', value: 'sat' },
  { label: 'niedziela', value: 'sun' },
] as const

const share = (name: string, label: string, defaultValue: number, max = 1) =>
  ({
    name,
    label,
    type: 'number',
    required: true,
    min: 0,
    max,
    defaultValue,
    admin: { step: 0.01, description: 'Ułamek: 0,05 = 5%.' },
  }) as const

/**
 * Price check through Claude (panel spec §11, §13; ADR-G007): schedule, alarms, how the market
 * cost is chosen, the monthly spending limit, the shops whose offers count (no marketplaces) and
 * competitors' prices typed by hand. Panel only.
 */
export const PriceCheckSettings: GlobalConfig = {
  slug: 'price-check-settings',
  label: 'Sprawdzanie cen',
  admin: { group: GROUP_OFFER },
  access: { read: adminOnly, update: adminOnly },
  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'days',
          label: 'Dni sprawdzania',
          type: 'select',
          hasMany: true,
          options: [...CHECK_DAYS],
          defaultValue: ['mon', 'fri'],
        },
        {
          name: 'hour',
          label: 'Godzina (czas polski)',
          type: 'number',
          required: true,
          min: 0,
          max: 23,
          defaultValue: 6,
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'alertMinMargin',
          label: 'Alarm: minimum przy obecnych cenach',
          type: 'checkbox',
          defaultValue: true,
        },
        {
          name: 'alertUnavailable',
          label: 'Alarm: część z zestawu niedostępna',
          type: 'checkbox',
          defaultValue: true,
        },
        share('alertChangePct', 'Alarm: zmiana kosztu ponad', 0.05),
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'costMethod',
          label: 'Koszt rynkowy',
          type: 'select',
          required: true,
          defaultValue: 'lowest',
          options: [
            { label: 'najniższa dostępna oferta', value: 'lowest' },
            { label: 'średnia z 2 najniższych', value: 'avg2' },
          ],
        },
        share('outlierPct', 'Do ręcznego sprawdzenia przy zmianie ponad', 0.25, 5),
        {
          name: 'monthlyBudgetUsd',
          label: 'Limit wydatków Claude na miesiąc (USD)',
          type: 'number',
          required: true,
          min: 0,
          max: 1000,
          defaultValue: 20,
        },
      ],
    },
    {
      name: 'shops',
      label: 'Dozwolone sklepy',
      type: 'array',
      admin: { description: 'Bez Ceneo i Allegro — pokazują oferty marketplace (ADR-G007 §1).' },
      defaultValue: DEFAULT_SHOPS.map((domain) => ({ domain })),
      fields: [
        {
          name: 'domain',
          label: 'Domena',
          type: 'text',
          required: true,
          validate: (value: string | null | undefined) =>
            (typeof value === 'string' && /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(value.trim())) ||
            'Sama domena, np. x-kom.pl.',
        },
      ],
    },
    {
      name: 'competitors',
      label: 'Konkurencja (cena wpisana ręcznie)',
      type: 'array',
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'build',
              label: 'Nasz zestaw',
              type: 'relationship',
              relationTo: 'builds',
              required: true,
            },
            { name: 'name', label: 'Odpowiednik (sklep i nazwa)', type: 'text', required: true },
          ],
        },
        {
          type: 'row',
          fields: [
            {
              name: 'url',
              label: 'Adres',
              type: 'text',
              validate: (value: string | null | undefined) =>
                !value || /^https:\/\//.test(value) || 'Adres https://',
            },
            { name: 'price', label: 'Cena (zł)', type: 'number', min: 0, required: true },
            { name: 'checkedAt', label: 'Sprawdzono', type: 'date', required: true },
          ],
        },
      ],
    },
  ],
}

/** Shops of the settings (or the start list) — the only hosts offer links may point to. */
export function shopsOf(
  settings: { shops?: { domain?: string | null }[] | null } | null,
): string[] {
  const list = (settings?.shops ?? [])
    .map((s) => s.domain?.trim().toLowerCase())
    .filter((d): d is string => Boolean(d))
  return list.length > 0 ? list : [...DEFAULT_SHOPS]
}
