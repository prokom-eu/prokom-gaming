import type { CollectionConfig } from 'payload'

import { adminOnly, nobody } from '../access/panel'
import { GROUP_SALES } from './shared'

export const UNMATCHED_STATUSES = [
  { value: 'new', label: 'Do przypisania' },
  { value: 'attached', label: 'Przypięta do zapytania' },
  { value: 'rejected', label: 'Odrzucona' },
] as const
export type UnmatchedStatus = (typeof UNMATCHED_STATUSES)[number]['value']

/** Unmatched mail is deleted this many days after it arrived (ADR-G008 pt 7). */
export const UNMATCHED_RETENTION_DAYS = 90

const readOnly = { access: { update: () => false }, admin: { readOnly: true } } as const

/**
 * Mail from the Gaming mailbox that matched no inquiry (ADR-G008 pt 3, panel spec §5, §17):
 * „Nieprzypisane” in the inbox, attached by hand or rejected. Plain text only. Written by the
 * `mail-intake` job; `create` is open to admins as well, so the e2e test can add one (an admin
 * can already write anything in a thread). Deleted after 90 days by `inquiry-retention`.
 */
export const MailIntakeUnmatched: CollectionConfig = {
  slug: 'mail-intake-unmatched',
  labels: { singular: 'Nieprzypisana wiadomość', plural: 'Nieprzypisane wiadomości' },
  admin: {
    group: GROUP_SALES,
    useAsTitle: 'subject',
    defaultColumns: ['receivedAt', 'from', 'subject', 'status'],
    description: 'Przypinasz albo odrzucasz w Zapytaniach → Nieprzypisane.',
  },
  defaultSort: '-receivedAt',
  // Status changes only through the panel's actions (they also write the thread).
  access: { read: adminOnly, create: adminOnly, update: nobody, delete: adminOnly },
  fields: [
    { name: 'from', label: 'Od', type: 'text', ...readOnly },
    { name: 'subject', label: 'Temat', type: 'text', ...readOnly },
    {
      name: 'receivedAt',
      label: 'Otrzymano',
      type: 'date',
      required: true,
      index: true,
      admin: { readOnly: true, date: { pickerAppearance: 'dayAndTime' } },
      access: { update: () => false },
    },
    {
      name: 'body',
      label: 'Treść',
      type: 'textarea',
      required: true,
      maxLength: 20_000,
      ...readOnly,
    },
    { name: 'attachmentsInfo', label: 'Załączniki w poczcie', type: 'text', ...readOnly },
    { name: 'messageId', label: 'Message-ID', type: 'text', index: true, ...readOnly },
    {
      name: 'references',
      label: 'In-Reply-To / References',
      type: 'text',
      admin: { readOnly: true, description: 'Kolejne identyfikatory oddzielone spacją.' },
      access: { update: () => false },
    },
    {
      name: 'status',
      label: 'Status',
      type: 'select',
      required: true,
      defaultValue: 'new',
      index: true,
      options: UNMATCHED_STATUSES.map(({ value, label }) => ({ value, label })),
      ...readOnly,
    },
    {
      name: 'attachedTo',
      label: 'Przypięta do',
      type: 'relationship',
      relationTo: 'inquiries',
      ...readOnly,
    },
  ],
}
