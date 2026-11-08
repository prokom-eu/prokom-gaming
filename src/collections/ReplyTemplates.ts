import type { CollectionConfig } from 'payload'

import { adminOnly } from '../access/panel'
import { GROUP_SALES } from './shared'

export const TEMPLATE_KINDS = [
  { value: 'reply', label: 'Odpowiedź' },
  { value: 'offer', label: 'Oferta (status „Oferta wysłana”)' },
  { value: 'stage', label: 'E-mail przy zmianie etapu zamówienia' },
] as const

/**
 * Reply templates of the inquiry inbox (panel spec §4). Variables: {nr}, {zestaw}, {cena},
 * {czesci}, {termin}, {podpis}; the signature is never added automatically — only through
 * {podpis}, so it cannot appear twice.
 */
export const ReplyTemplates: CollectionConfig = {
  slug: 'reply-templates',
  labels: { singular: 'Szablon odpowiedzi', plural: 'Szablony odpowiedzi' },
  admin: {
    group: GROUP_SALES,
    useAsTitle: 'name',
    defaultColumns: ['name', 'kind', 'order', 'active'],
    description:
      'Zmienne: {nr}, {zestaw}, {cena}, {czesci}, {termin}, {podpis}. Podpis wstawia tylko {podpis}.',
  },
  defaultSort: 'order',
  access: { read: adminOnly, create: adminOnly, update: adminOnly, delete: adminOnly },
  fields: [
    {
      type: 'row',
      fields: [
        { name: 'name', label: 'Nazwa', type: 'text', required: true, unique: true, maxLength: 60 },
        {
          name: 'kind',
          label: 'Rodzaj',
          type: 'select',
          required: true,
          defaultValue: 'reply',
          options: TEMPLATE_KINDS.map(({ value, label }) => ({ value, label })),
        },
        { name: 'order', label: 'Kolejność', type: 'number', required: true, defaultValue: 0 },
        { name: 'active', label: 'Aktywny', type: 'checkbox', defaultValue: true },
      ],
    },
    { name: 'body', label: 'Treść', type: 'textarea', required: true, maxLength: 5000 },
  ],
}
