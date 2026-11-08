import type { CollectionConfig } from 'payload'

import { adminOnly, nobody } from '../access/panel'
import { GROUP_OFFER } from './shared'

/**
 * One offer as Claude read it in a price check (panel spec §17, ADR-G007 §3): price, availability,
 * whether it is the same product, a short quote from the page. Data from shops — shown as text,
 * never as instructions. Deleted with its check.
 */
export const PriceObservations: CollectionConfig = {
  slug: 'price-observations',
  labels: { singular: 'Odczyt oferty', plural: 'Odczyty ofert' },
  admin: {
    group: GROUP_OFFER,
    useAsTitle: 'url',
    defaultColumns: ['itemCode', 'shop', 'pricePln', 'available', 'matched', 'observedAt'],
  },
  defaultSort: '-observedAt',
  access: { read: adminOnly, create: nobody, update: nobody, delete: adminOnly },
  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'check',
          label: 'Sprawdzenie',
          type: 'relationship',
          relationTo: 'price-checks',
          required: true,
          index: true,
        },
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
          label: 'Kod albo klucz części',
          type: 'text',
          required: true,
          index: true,
        },
        { name: 'componentRole', label: 'Rola części', type: 'text' },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'url', label: 'Adres', type: 'text', required: true },
        { name: 'shop', label: 'Sklep', type: 'text' },
        { name: 'title', label: 'Tytuł oferty', type: 'text' },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'pricePln', label: 'Cena (zł)', type: 'number' },
        { name: 'available', label: 'Dostępna', type: 'checkbox', defaultValue: false },
        { name: 'matched', label: 'Ten sam produkt', type: 'checkbox', defaultValue: false },
        {
          name: 'method',
          label: 'Sposób',
          type: 'select',
          options: [
            { label: 'odczyt strony', value: 'fetch' },
            { label: 'wyszukiwanie', value: 'search' },
          ],
        },
      ],
    },
    { name: 'quote', label: 'Cytat ze strony', type: 'text', maxLength: 200 },
    { name: 'note', label: 'Uwaga', type: 'text' },
    { name: 'observedAt', label: 'Odczyt', type: 'date', required: true },
  ],
}
