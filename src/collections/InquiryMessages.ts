import type { CollectionConfig } from 'payload'

import { adminOnly, nobody } from '../access/panel'
import { GROUP_SALES } from './shared'

export const MESSAGE_DIRECTIONS = [
  { value: 'in', label: 'Od klienta' },
  { value: 'out', label: 'Wysłana odpowiedź' },
  { value: 'note', label: 'Notatka wewnętrzna' },
  { value: 'system', label: 'Wpis systemowy' },
] as const

const readOnly = { access: { update: () => false }, admin: { readOnly: true } } as const

/**
 * The thread of an inquiry (panel spec §4, §17; ADR-G008): replies sent from the panel, internal
 * notes, and from P4 the customer's answers from the mailbox. Written only by the panel's actions
 * and jobs through the Local API — a sent e-mail cannot be edited afterwards, so neither can its
 * record. Deleted together with the inquiry (retention and erasure, spec §16).
 */
export const InquiryMessages: CollectionConfig = {
  slug: 'inquiry-messages',
  labels: { singular: 'Wiadomość zapytania', plural: 'Wiadomości zapytań' },
  admin: {
    group: GROUP_SALES,
    useAsTitle: 'subject',
    defaultColumns: ['at', 'inquiry', 'direction', 'subject'],
    description: 'Wątek zapytania. Odpowiadasz i dodajesz notatki w Zapytaniach.',
  },
  defaultSort: '-at',
  // No single deletes either: the thread goes only with its inquiry (`deleteThread` hook).
  access: { read: adminOnly, create: nobody, update: nobody, delete: nobody },
  indexes: [{ fields: ['inquiry', 'at'] }],
  fields: [
    {
      name: 'inquiry',
      label: 'Zapytanie',
      type: 'relationship',
      relationTo: 'inquiries',
      required: true,
      index: true,
      ...readOnly,
    },
    {
      type: 'row',
      fields: [
        {
          name: 'direction',
          label: 'Rodzaj',
          type: 'select',
          required: true,
          options: MESSAGE_DIRECTIONS.map(({ value, label }) => ({ value, label })),
          ...readOnly,
        },
        {
          name: 'at',
          label: 'Kiedy',
          type: 'date',
          required: true,
          admin: { readOnly: true, date: { pickerAppearance: 'dayAndTime' } },
          access: { update: () => false },
        },
      ],
    },
    { name: 'subject', label: 'Temat', type: 'text', ...readOnly },
    // Plain text only (ADR-G008 pt 4): the panel never renders HTML from a message.
    {
      name: 'body',
      label: 'Treść',
      type: 'textarea',
      required: true,
      maxLength: 20_000,
      ...readOnly,
    },
    {
      name: 'author',
      label: 'Autor',
      type: 'relationship',
      relationTo: 'users',
      admin: { readOnly: true, description: 'Puste = klient.' },
      access: { update: () => false },
    },
    {
      type: 'row',
      fields: [
        { name: 'messageId', label: 'Message-ID', type: 'text', index: true, ...readOnly },
        { name: 'inReplyTo', label: 'In-Reply-To', type: 'text', ...readOnly },
      ],
    },
    { name: 'attachmentsInfo', label: 'Załączniki w poczcie', type: 'text', ...readOnly },
    // ADR-G008 pt 3: a mail with the inquiry's number from another address is attached, marked.
    {
      name: 'otherSender',
      label: 'Inny nadawca',
      type: 'text',
      admin: { readOnly: true, description: 'Adres nadawcy, gdy to nie adres klienta.' },
      access: { update: () => false },
    },
    {
      name: 'template',
      label: 'Szablon',
      type: 'relationship',
      relationTo: 'reply-templates',
      ...readOnly,
    },
  ],
}
