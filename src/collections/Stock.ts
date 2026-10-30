import {
  ValidationError,
  type Access,
  type CollectionBeforeChangeHook,
  type CollectionConfig,
} from 'payload'

import { isPanelUser, panelOnly } from '../access/panel'
import { SKIP_STOCK_GUARD, STOCK_CONDITIONS, STOCK_LOCATIONS } from '../lib/stock'
import { GROUP_OFFER } from './shared'

const options = (list: readonly { value: string; label: string }[]) =>
  list.map(({ value, label }) => ({ value, label }))

const idOf = (ref: unknown): number | null => {
  if (typeof ref === 'number') return ref
  if (typeof ref === 'object' && ref !== null && 'id' in ref) return Number(ref.id)
  return null
}

/** The site reads units on sale only; the panel reads all of them. */
const onSaleOrPanel: Access = ({ req }) => (isPanelUser(req) ? true : { active: { equals: true } })

/**
 * Margin guard (ADR-G002 §7, addendum 30.10.2026): a unit is saved only when its configuration
 * is priced, compatible and its price minus the discount keeps the minimum margin.
 */
const guardMargin: CollectionBeforeChangeHook = async ({ data, originalDoc, req, context }) => {
  if (context[SKIP_STOCK_GUARD]) return data
  const merged = { ...originalDoc, ...data }
  const buildId = idOf(merged.build)
  if (buildId === null) return data
  const { guardStockUnit } = await import('./stockGuard.server')
  const result = await guardStockUnit(
    req.payload,
    { buildId, changes: merged.changes },
    merged.discount,
  )
  if (!result.ok) {
    throw new ValidationError(
      {
        collection: 'stock',
        errors: [
          { path: result.path === 'config' ? 'changes' : result.path, message: result.message },
        ],
      },
      req.t,
    )
  }
  return data
}

const code = (name: string, label: string) => ({
  name,
  label,
  type: 'text' as const,
  admin: { placeholder: 'jak w zestawie' },
})

/**
 * „Gotowe od ręki” (spec. §11, ADR-G005): units already built — from the shelf, pokazowe, after a
 * return. Price = the configuration from the newest published batch minus `discount`; the site
 * never takes a price typed in here.
 */
export const Stock: CollectionConfig = {
  slug: 'stock',
  labels: { singular: 'Egzemplarz od ręki', plural: 'Gotowe od ręki' },
  admin: {
    group: GROUP_OFFER,
    useAsTitle: 'conditionNote',
    defaultColumns: ['conditionNote', 'build', 'location', 'discount', 'reservedUntil', 'active'],
    description:
      'Egzemplarze do kupienia od ręki. Cena = cena konfiguracji z cennika minus rabat (strażnik marży). Strona widoczna po włączeniu FEATURE_READY.',
  },
  access: { read: onSaleOrPanel, create: panelOnly, update: panelOnly, delete: panelOnly },
  hooks: { beforeChange: [guardMargin] },
  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'build',
          label: 'Zestaw',
          type: 'relationship',
          relationTo: 'builds',
          required: true,
        },
        {
          name: 'location',
          label: 'Gdzie stoi',
          type: 'select',
          required: true,
          options: options(STOCK_LOCATIONS),
        },
        {
          name: 'condition',
          label: 'Stan',
          type: 'select',
          required: true,
          options: options(STOCK_CONDITIONS),
        },
      ],
    },
    {
      name: 'changes',
      label: 'Zmiany w przepisie zestawu (kody; puste = jak w zestawie)',
      type: 'group',
      fields: [
        {
          type: 'row',
          fields: [
            code('level', 'Poziom mocy'),
            code('case', 'Obudowa'),
            code('cooler', 'Chłodzenie'),
            code('ram', 'RAM'),
            code('ssd', 'Dysk'),
          ],
        },
      ],
    },
    {
      name: 'conditionNote',
      label: 'Opis stanu (na stronie)',
      type: 'text',
      required: true,
      admin: { description: 'Np. „egzemplarz pokazowy, nieużywany, pełna gwarancja”.' },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'discount',
          label: 'Rabat egzemplarza (zł)',
          type: 'number',
          min: 0,
          defaultValue: 0,
          admin: { description: 'Odejmowany od ceny konfiguracji. Strażnik pilnuje marży.' },
        },
        { name: 'active', label: 'Na stronie', type: 'checkbox', defaultValue: true, index: true },
      ],
    },
    {
      name: 'reservedUntil',
      label: 'Zarezerwowany do',
      type: 'date',
      admin: {
        position: 'sidebar',
        date: { pickerAppearance: 'dayAndTime' },
        description: 'Ustawia rezerwacja ze strony (24 h). Wyczyść, żeby zwolnić.',
      },
    },
  ],
}
