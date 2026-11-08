import type { GlobalConfig } from 'payload'

import { adminOnly, nobody } from '../access/panel'
import { GROUP_SALES } from '../collections/shared'

const readOnly = { admin: { readOnly: true } } as const

/**
 * Where reading the Gaming mailbox got to (ADR-G008 pt 2, panel spec §17): the last UID taken
 * in INBOX for its UIDVALIDITY, the last run and the errors in a row (alarm at 3). Written only by
 * the `mail-intake` job; flags in the mailbox are never used for this.
 */
export const MailIntakeState: GlobalConfig = {
  slug: 'mail-intake-state',
  label: 'Odbiór poczty (stan)',
  admin: { group: GROUP_SALES },
  access: { read: adminOnly, update: nobody },
  fields: [
    {
      type: 'row',
      fields: [
        { name: 'lastUid', label: 'Ostatni UID', type: 'number', defaultValue: 0, ...readOnly },
        { name: 'uidValidity', label: 'UIDVALIDITY', type: 'text', ...readOnly },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'lastRunAt',
          label: 'Ostatni przebieg',
          type: 'date',
          admin: { readOnly: true, date: { pickerAppearance: 'dayAndTime' } },
        },
        {
          name: 'lastOkAt',
          label: 'Ostatni udany przebieg',
          type: 'date',
          admin: { readOnly: true, date: { pickerAppearance: 'dayAndTime' } },
        },
        {
          name: 'errorCount',
          label: 'Błędy z rzędu',
          type: 'number',
          defaultValue: 0,
          ...readOnly,
        },
      ],
    },
  ],
}
