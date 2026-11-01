import type { CollectionBeforeChangeHook, CollectionConfig } from 'payload'

import { adminOnly } from '../access/panel'
import { DEFAULT_SHOPS, shopOf } from '../lib/pricing/sources'
import { GROUP_OFFER } from './shared'

const NOT_A_SHOP = `Adres musi być stroną oferty w jednym ze sklepów: ${DEFAULT_SHOPS.join(', ')}.`

// The shop is always derived from the address, never typed.
const setShop: CollectionBeforeChangeHook = ({ data, originalDoc }) => {
  const url = data.url ?? (originalDoc as { url?: string } | undefined)?.url
  data.shop = typeof url === 'string' ? (shopOf(url.trim()) ?? '') : ''
  return data
}

/**
 * Offer links used as cost sources (ADR-G007 §5): 2–4 per item, added in the panel or accepted
 * from Claude's proposals (P7). `itemCode` is an option code or a part's `partKey`, so one link
 * serves the same part in every power level. Costs live in the items, not here.
 */
export const PriceSources: CollectionConfig = {
  slug: 'price-sources',
  labels: { singular: 'Link do oferty', plural: 'Linki do ofert' },
  admin: {
    group: GROUP_OFFER,
    useAsTitle: 'url',
    defaultColumns: ['itemType', 'itemCode', 'shop', 'active', 'lastOk'],
    listSearchableFields: ['itemCode', 'url'],
  },
  defaultSort: 'itemCode',
  access: { read: adminOnly, create: adminOnly, update: adminOnly, delete: adminOnly },
  hooks: { beforeChange: [setShop] },
  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'itemType',
          label: 'Rodzaj',
          type: 'select',
          required: true,
          options: [
            { label: 'Opcja', value: 'option' },
            { label: 'Część poziomu mocy', value: 'component' },
          ],
        },
        {
          name: 'itemCode',
          label: 'Kod opcji albo klucz części',
          type: 'text',
          required: true,
          index: true,
          maxLength: 120,
        },
        {
          name: 'componentRole',
          label: 'Rola części',
          type: 'select',
          options: [
            { label: 'Procesor', value: 'cpu' },
            { label: 'Karta graficzna', value: 'gpu' },
            { label: 'Płyta główna', value: 'mobo' },
            { label: 'Zasilacz', value: 'psu' },
          ],
          admin: { condition: (_data, sibling) => sibling?.itemType === 'component' },
        },
      ],
    },
    {
      name: 'url',
      label: 'Adres oferty',
      type: 'text',
      required: true,
      maxLength: 1000,
      validate: (value: string | null | undefined) =>
        (typeof value === 'string' && shopOf(value.trim()) !== null) || NOT_A_SHOP,
    },
    {
      type: 'row',
      fields: [
        { name: 'shop', label: 'Sklep', type: 'text', admin: { readOnly: true } },
        { name: 'active', label: 'Sprawdzany', type: 'checkbox', defaultValue: true },
        {
          name: 'proposedByClaude',
          label: 'Propozycja Claude',
          type: 'checkbox',
          defaultValue: false,
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'lastOk',
          label: 'Ostatnia cena odczytana',
          type: 'date',
          admin: { readOnly: true },
        },
        { name: 'lastError', label: 'Ostatni błąd', type: 'text', admin: { readOnly: true } },
      ],
    },
  ],
}
