import { randomInt } from 'node:crypto'

import type { CollectionBeforeChangeHook, CollectionConfig } from 'payload'

import { adminOnly } from '../access/panel'
import { VOUCHER_AMOUNTS, VOUCHER_DESIGN_CHOICES } from '../lib/inquiry/types'
import { GROUP_OFFER } from './shared'

// No 0/O and 1/I/L: the code is read from paper.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

/** Random code `XXXX-XXXX` (crypto), like the board's „Kod [XXXX-XXXX]”. */
export function voucherCode(): string {
  const part = () => Array.from({ length: 4 }, () => ALPHABET[randomInt(ALPHABET.length)]).join('')
  return `${part()}-${part()}`
}

const assignCode: CollectionBeforeChangeHook = ({ data, operation }) =>
  operation === 'create' && !data.code ? { ...data, code: voucherCode() } : data

// TODO(krystian): retention of `recipient` and `dedication` (data of a third person) — with the
// privacy policy; the inquiry retention job does not cover vouchers.
/**
 * Gift vouchers (spec. §12, ADR-G005): the order is an inquiry of type `voucher`; the panel issues
 * the voucher (code, PDF) after the payment. Panel only — nothing public reads codes.
 */
export const Vouchers: CollectionConfig = {
  slug: 'vouchers',
  labels: { singular: 'Bon', plural: 'Bony podarunkowe' },
  admin: {
    group: GROUP_OFFER,
    useAsTitle: 'code',
    defaultColumns: ['code', 'amount', 'status', 'validUntil'],
    description:
      'Bon wystawiasz po wpłacie za zapytanie typu „Bon podarunkowy”. Kod nadaje się sam.',
  },
  access: { read: adminOnly, create: adminOnly, update: adminOnly, delete: adminOnly },
  hooks: { beforeChange: [assignCode] },
  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'code',
          label: 'Kod',
          type: 'text',
          unique: true,
          index: true,
          admin: { readOnly: true, description: 'Nadawany przy zapisie.' },
        },
        {
          name: 'amount',
          label: 'Kwota (zł)',
          type: 'number',
          required: true,
          validate: (value: unknown) =>
            VOUCHER_AMOUNTS.some((v) => v.amount === value) ||
            `Kwota z listy: ${VOUCHER_AMOUNTS.map((v) => v.amount).join(', ')} zł.`,
        },
        {
          name: 'status',
          label: 'Status',
          type: 'select',
          required: true,
          defaultValue: 'ordered',
          options: [
            { label: 'Zamówiony', value: 'ordered' },
            { label: 'Opłacony', value: 'paid' },
            { label: 'Wystawiony', value: 'issued' },
            { label: 'Wykorzystany', value: 'used' },
          ],
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'design',
          label: 'Wygląd',
          type: 'select',
          required: true,
          options: VOUCHER_DESIGN_CHOICES.map(({ value, label }) => ({ value, label })),
        },
        { name: 'recipient', label: 'Dla kogo', type: 'text' },
        { name: 'dedication', label: 'Dedykacja', type: 'text' },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'validUntil',
          label: 'Ważny do',
          type: 'date',
          admin: { date: { pickerAppearance: 'dayOnly', displayFormat: 'dd.MM.yyyy' } },
        },
        { name: 'inquiry', label: 'Zapytanie', type: 'relationship', relationTo: 'inquiries' },
      ],
    },
  ],
}
