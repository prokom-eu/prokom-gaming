import type { Access, CollectionConfig, Where } from 'payload'

import { isPanelUser, nobody } from '../access/panel'
import { PUSH_KINDS, PUSH_KIND_LABELS } from '../lib/notify/kinds'
import { GROUP_ADMIN } from './shared'

/** After this many failed sends in a row a device is switched off (ADR-G010 pt 4). */
export const MAX_PUSH_FAILS = 5

/** A panel user sees only their own devices. */
const ownDevices: Access = ({ req }) => {
  if (!isPanelUser(req) || !req.user) return false
  const where: Where = { user: { equals: req.user.id } }
  return where
}

const readOnly = { access: { update: () => false }, admin: { readOnly: true } } as const
/** Push keys never leave the server: the job reads them with overrideAccess. */
const secret = {
  access: { read: () => false, update: () => false },
  admin: { hidden: true },
} as const

/**
 * Phones and computers that get the panel's push notifications (ADR-G010 pt 4, panel spec §17):
 * one record per browser subscription of a signed-in panel user. Written only by the Settings
 * actions (they check the session) and the `notify-send` job; 404/410 from the push service
 * deletes the record, 5 other failures in a row switch it off.
 */
export const PushSubscriptions: CollectionConfig = {
  slug: 'push-subscriptions',
  labels: { singular: 'Urządzenie z powiadomieniami', plural: 'Urządzenia z powiadomieniami' },
  admin: {
    group: GROUP_ADMIN,
    useAsTitle: 'label',
    defaultColumns: ['label', 'user', 'lastOkAt', 'failCount'],
    description: 'Włączasz i usuwasz w Ustawieniach → Powiadomienia na telefon.',
  },
  access: { read: ownDevices, create: nobody, update: nobody, delete: ownDevices },
  fields: [
    {
      name: 'user',
      label: 'Konto panelu',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
      ...readOnly,
    },
    {
      name: 'label',
      label: 'Urządzenie',
      type: 'text',
      required: true,
      maxLength: 60,
      ...readOnly,
    },
    { name: 'endpoint', type: 'text', required: true, unique: true, ...secret },
    { name: 'p256dh', type: 'text', required: true, ...secret },
    { name: 'auth', type: 'text', required: true, ...secret },
    {
      name: 'kinds',
      label: 'Rodzaje powiadomień',
      type: 'select',
      hasMany: true,
      options: PUSH_KINDS.map((value) => ({ value, label: PUSH_KIND_LABELS[value] })),
      ...readOnly,
    },
    {
      type: 'row',
      fields: [
        {
          name: 'lastOkAt',
          label: 'Ostatnie doręczenie',
          type: 'date',
          admin: { readOnly: true, date: { pickerAppearance: 'dayAndTime' } },
          access: { update: () => false },
        },
        { name: 'failCount', label: 'Błędy z rzędu', type: 'number', defaultValue: 0, ...readOnly },
        {
          name: 'disabledAt',
          label: 'Wyłączone (po błędach)',
          type: 'date',
          admin: { readOnly: true, date: { pickerAppearance: 'dayAndTime' } },
          access: { update: () => false },
        },
      ],
    },
  ],
}
