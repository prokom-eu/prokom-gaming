import type { CollectionConfig } from 'payload'

import { nobody, adminOnly } from '../access/panel'
import { GROUP_OFFER, PRICE_ITEM_TYPES } from './shared'

/**
 * When each price was in force (ADR-G002 §2): the base of the Omnibus "lowest price in 30 days".
 * Every publication closes the previous rows (`validTo`) and adds new ones. Panel read only;
 * the site reads it on the server.
 */
export const PriceHistory: CollectionConfig = {
  slug: 'price-history',
  labels: { singular: 'Wpis historii cen', plural: 'Historia cen' },
  admin: {
    group: GROUP_OFFER,
    useAsTitle: 'itemCode',
    defaultColumns: ['itemType', 'itemCode', 'sellPrice', 'validFrom', 'validTo'],
  },
  defaultSort: '-validFrom',
  access: { read: adminOnly, create: nobody, update: nobody, delete: nobody },
  fields: [
    { name: 'batch', label: 'Partia', type: 'number', required: true, min: 1 },
    {
      name: 'itemType',
      label: 'Rodzaj',
      type: 'select',
      required: true,
      options: PRICE_ITEM_TYPES,
    },
    { name: 'itemCode', label: 'Kod', type: 'text', required: true, index: true },
    { name: 'sellPrice', label: 'Cena sprzedaży (zł)', type: 'number', required: true, min: 0 },
    { name: 'validFrom', label: 'Obowiązuje od', type: 'date', required: true },
    {
      name: 'validTo',
      label: 'Obowiązuje do',
      type: 'date',
      admin: { description: 'Puste = cena obowiązuje.' },
    },
  ],
}
