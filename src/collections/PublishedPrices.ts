import type { CollectionConfig } from 'payload'

import { anyone, nobody, panelField } from '../access/panel'
import { GROUP_OFFER, PRICE_ITEM_TYPES } from './shared'

/**
 * Price snapshot (ADR-G002 §2): one row per level, option, service and level "price from" in each
 * publication (`batch`). The site reads only the newest batch. Nobody edits rows by hand — they are
 * written by the seed (first batch) and by price publication in the panel (G4).
 */
export const PublishedPrices: CollectionConfig = {
  slug: 'published-prices',
  labels: { singular: 'Cena opublikowana', plural: 'Ceny — publikacja' },
  admin: {
    group: GROUP_OFFER,
    useAsTitle: 'itemCode',
    defaultColumns: ['batch', 'itemType', 'itemCode', 'sellPrice', 'publishedAt'],
    description: 'Ceny publikuje ekran „Ceny” (G4) po sprawdzeniu marży. Ręcznej edycji nie ma.',
  },
  defaultSort: '-batch',
  access: { read: anyone, create: nobody, update: nobody, delete: nobody },
  indexes: [{ fields: ['batch', 'itemType', 'itemCode'], unique: true }],
  fields: [
    { name: 'batch', label: 'Partia', type: 'number', required: true, min: 1, index: true },
    {
      name: 'itemType',
      label: 'Rodzaj',
      type: 'select',
      required: true,
      options: PRICE_ITEM_TYPES,
    },
    { name: 'itemCode', label: 'Kod', type: 'text', required: true },
    { name: 'sellPrice', label: 'Cena sprzedaży (zł)', type: 'number', required: true, min: 0 },
    {
      name: 'costAtPublish',
      label: 'Koszt przy publikacji (tylko panel)',
      type: 'number',
      min: 0,
      ...panelField,
    },
    { name: 'publishedAt', label: 'Opublikowano', type: 'date', required: true },
    {
      name: 'publishedBy',
      label: 'Opublikował (tylko panel)',
      type: 'relationship',
      relationTo: 'users',
      ...panelField,
    },
  ],
}
