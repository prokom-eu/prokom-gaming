import type { CollectionConfig } from 'payload'

import { nobody, panelOnly } from '../access/panel'
import { GROUP_SALES } from './shared'

/**
 * Trail of deleted inquiries (ADR-G005): id, number, who and when — no content, so erased personal
 * data does not survive here. Written only by the `inquiries` delete hook.
 */
export const InquiryDeletions: CollectionConfig = {
  slug: 'inquiry-deletions',
  labels: { singular: 'Usunięte zapytanie', plural: 'Usunięte zapytania' },
  admin: {
    group: GROUP_SALES,
    useAsTitle: 'number',
    defaultColumns: ['createdAt', 'number', 'reason', 'deletedByEmail'],
  },
  defaultSort: '-createdAt',
  access: { read: panelOnly, create: nobody, update: nobody, delete: nobody },
  fields: [
    { name: 'inquiryId', label: 'ID zapytania', type: 'number', required: true },
    { name: 'number', label: 'Numer', type: 'text' },
    {
      name: 'reason',
      label: 'Powód',
      type: 'select',
      required: true,
      options: [
        { label: 'Na żądanie (panel)', value: 'request' },
        { label: 'Koniec okresu przechowywania', value: 'retention' },
      ],
    },
    { name: 'deletedBy', label: 'Usunął', type: 'relationship', relationTo: 'users' },
    // Kept when the panel account is removed later.
    { name: 'deletedByEmail', label: 'E-mail usuwającego', type: 'email' },
  ],
}
