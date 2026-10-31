import type { GlobalConfig, NumberField } from 'payload'

import { adminOnly } from '../access/panel'
import { GROUP_SALES } from '../collections/shared'

const hour = (name: 'from', label: string, defaultValue: number): NumberField => ({
  name,
  label,
  type: 'number',
  required: true,
  min: 0,
  max: 24,
  defaultValue,
})

// The end hour must come after the start (`to` only; `from` alone cannot be wrong).
const replyTo: NumberField = {
  name: 'to',
  label: 'Do godziny',
  type: 'number',
  required: true,
  min: 0,
  max: 24,
  defaultValue: 22,
  validate: (value, { siblingData }) => {
    const from = (siblingData as { from?: unknown }).from
    if (typeof value !== 'number' || typeof from !== 'number') return true
    return value > from || 'Godzina końca musi być późniejsza niż początku.'
  },
}

const minutes = (name: string, label: string, defaultValue: number): NumberField => ({
  name,
  label,
  type: 'number',
  required: true,
  min: 5,
  max: 24 * 60,
  defaultValue,
})

/**
 * Inquiries and mail (panel spec §13, ADR-G008): reply hours of the promise on the site, the
 * reply time shown on the list, the SLA alarm and the signature for {podpis}. The sender is the
 * Gaming mailbox from env (`MAIL_FROM_ADDRESS`) — not editable here.
 */
export const MailSettings: GlobalConfig = {
  slug: 'mail-settings',
  label: 'Zapytania i poczta',
  admin: { group: GROUP_SALES },
  access: { read: adminOnly, update: adminOnly },
  fields: [
    {
      name: 'replyHours',
      label: 'Godziny odpowiedzi (czas polski)',
      type: 'group',
      fields: [
        {
          type: 'row',
          fields: [hour('from', 'Od godziny', 8), replyTo],
        },
      ],
    },
    {
      type: 'row',
      fields: [
        minutes('replySlaMinutes', 'Obietnica odpowiedzi (min)', 60),
        minutes('replyAlarmMinutes', 'Alarm bez odpowiedzi po (min)', 45),
      ],
    },
    {
      name: 'signature',
      label: 'Podpis ({podpis})',
      type: 'textarea',
      required: true,
      maxLength: 500,
      defaultValue: 'Pozdrawiam,\nKrystian · PRO-KOM Gaming',
    },
  ],
}
