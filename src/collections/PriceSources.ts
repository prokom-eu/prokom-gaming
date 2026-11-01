import type { CollectionBeforeChangeHook, CollectionConfig, PayloadRequest } from 'payload'

import { adminOnly } from '../access/panel'
import { allowedShops } from '../lib/price-check/shops'
import { ceneoProductId, ceneoUrl, sourceShop } from '../lib/pricing/sources'
import { GROUP_OFFER } from './shared'

// TODO(krystian): wording (no board).
const notAShop = (shops: string[]) =>
  `Adres musi być stroną produktu na Ceneo (ceneo.pl/123456) albo stroną oferty w jednym ze sklepów: ${shops.join(', ')}.`

// The shop is always derived from the address, never typed.
const setShop: CollectionBeforeChangeHook = async ({ data, originalDoc, req }) => {
  const url = data.url ?? (originalDoc as { url?: string } | undefined)?.url
  const shops = await allowedShops(req.payload)
  data.shop = typeof url === 'string' ? (sourceShop(url.trim(), shops) ?? '') : ''
  // One form per Ceneo page, so the same page is never linked (and read) twice.
  const id = typeof url === 'string' ? ceneoProductId(url.trim()) : null
  if (id !== null) data.url = ceneoUrl(id)
  return data
}

/**
 * Offer links used as cost sources (ADR-G007 §5): a Ceneo product page (the trusted shops'
 * offers in one page, ADR-G011) and/or offer pages of the shops, added in the panel or accepted
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
      // The shops of „Sprawdzanie cen” (P7); the start list until they are set.
      validate: async (value: string | null | undefined, { req }: { req: PayloadRequest }) => {
        const shops = await allowedShops(req.payload)
        return (
          (typeof value === 'string' && sourceShop(value.trim(), shops) !== null) || notAShop(shops)
        )
      },
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
