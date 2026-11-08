import type { CollectionBeforeChangeHook, CollectionConfig } from 'payload'

import { staffField, staffOrOwnRecords } from '../access/customer'
import { adminOnly, isPanelUser, staffOnly } from '../access/panel'
import { TICKET_CATEGORIES, TICKET_DESCRIPTION_MAX, TICKET_STATUSES } from '../lib/account/tickets'
import { GROUP_WORKSHOP, normalizeEmailHook } from './shared'

type HistoryEntry = { at: string; status: string; by?: number | null }

/** Every status change is kept with when and by whom (ADR-G005 `history[]`). */
const trackStatus: CollectionBeforeChangeHook = ({ data, operation, originalDoc, req }) => {
  if (operation !== 'create' && operation !== 'update') return data
  const status = data.status ?? originalDoc?.status ?? 'new'
  if (operation === 'update' && status === originalDoc?.status) return data
  const history: HistoryEntry[] = [...((originalDoc?.history as HistoryEntry[]) ?? [])]
  history.push({
    at: new Date().toISOString(),
    status,
    by: isPanelUser(req) ? (req.user?.id as number) : null,
  })
  return { ...data, status, history }
}

/**
 * Problem reports (ADR-G005). A customer files one in the account (`POST /api/konto/zgloszenie`,
 * unit, e-mail and account taken from the session — never from the form) and reads their own;
 * the service handles them in the panel.
 */
export const Tickets: CollectionConfig = {
  slug: 'tickets',
  labels: { singular: 'Zgłoszenie', plural: 'Zgłoszenia' },
  admin: {
    group: GROUP_WORKSHOP,
    useAsTitle: 'category',
    defaultColumns: ['createdAt', 'unit', 'category', 'status'],
    listSearchableFields: ['email', 'description'],
  },
  defaultSort: '-createdAt',
  access: { read: staffOrOwnRecords, create: staffOnly, update: staffOnly, delete: adminOnly },
  hooks: { beforeChange: [trackStatus] },
  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'unit',
          label: 'Egzemplarz',
          type: 'relationship',
          relationTo: 'units',
          required: true,
        },
        {
          name: 'category',
          label: 'Co się dzieje',
          type: 'select',
          required: true,
          options: TICKET_CATEGORIES.map(({ value, label }) => ({ value, label })),
        },
        {
          name: 'status',
          label: 'Status',
          type: 'select',
          required: true,
          defaultValue: 'new',
          options: TICKET_STATUSES.map(({ value, label }) => ({ value, label })),
        },
      ],
    },
    {
      name: 'description',
      label: 'Opis',
      type: 'textarea',
      required: true,
      maxLength: TICKET_DESCRIPTION_MAX,
    },
    {
      type: 'row',
      fields: [
        {
          name: 'remoteHelpConsent',
          label: 'Zgoda na pomoc zdalną przy tym zgłoszeniu',
          type: 'checkbox',
          defaultValue: false,
        },
        {
          name: 'email',
          label: 'E-mail klienta',
          type: 'email',
          required: true,
          index: true,
          hooks: { beforeValidate: [normalizeEmailHook] },
          ...staffField,
        },
        {
          name: 'customer',
          label: 'Konto klienta',
          type: 'relationship',
          relationTo: 'customers',
          ...staffField,
        },
      ],
    },
    {
      name: 'history',
      label: 'Historia',
      type: 'array',
      admin: { readOnly: true },
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'at', label: 'Kiedy', type: 'date', required: true },
            {
              name: 'status',
              label: 'Status',
              type: 'select',
              required: true,
              options: TICKET_STATUSES.map(({ value, label }) => ({ value, label })),
            },
            { name: 'by', label: 'Kto', type: 'relationship', relationTo: 'users', ...staffField },
          ],
        },
      ],
    },
  ],
}
