import type {
  CollectionAfterDeleteHook,
  CollectionBeforeChangeHook,
  CollectionConfig,
  Field,
} from 'payload'

import { isPanelUser, nobody, panelOnly } from '../access/panel'
import { formatInquiryNumber, nextInquirySeq, yearInPoland } from '../lib/inquiry/number'
import { nextStatusChangedAt } from '../lib/inquiry/status'
import { CHOICES, INQUIRY_STATUS_CHOICES, INQUIRY_TYPE_CHOICES } from '../lib/inquiry/types'
import { GROUP_SALES } from './shared'

// Everything but `status` is what the customer sent (or the server computed): nobody edits it,
// not even in the panel. Field access drops such values from API updates; `readOnly` only greys
// out the panel input.
const locked = { access: { update: () => false }, admin: { readOnly: true } } as const

const options = (choices: readonly { value: string; label: string }[]) =>
  choices.map(({ value, label }) => ({ value, label }))

const text = (name: string, label: string): Field => ({ name, label, type: 'text', ...locked })

const select = (name: keyof typeof CHOICES, label: string, hasMany = false): Field => ({
  name,
  label,
  type: 'select',
  options: options(CHOICES[name]),
  hasMany,
  ...locked,
})

/**
 * Number `PKG-RRRR-NNNN` from the yearly counter, in the insert's transaction (`req`), so a failed
 * insert leaves no gap. Any way of creating an inquiry gets one, not only `submitInquiry()`.
 */
const assignNumber: CollectionBeforeChangeHook = async ({ data, operation, req }) => {
  if (operation !== 'create' || data.number) return data
  const year = yearInPoland(new Date())
  return { ...data, number: formatInquiryNumber(year, await nextInquirySeq(req, year)) }
}

const trackStatusChange: CollectionBeforeChangeHook = ({ data, operation, originalDoc }) => {
  if (operation !== 'create' && operation !== 'update') return data
  return {
    ...data,
    statusChangedAt: nextStatusChangedAt({
      operation,
      status: data.status,
      previousStatus: originalDoc?.status,
      previousChangedAt: originalDoc?.statusChangedAt,
      now: new Date(),
    }),
  }
}

/** Erasure trail (ADR-G005): which record, who and when — never its content. */
const recordDeletion: CollectionAfterDeleteHook = async ({ doc, req }) => {
  const user = isPanelUser(req) ? req.user : null
  await req.payload.create({
    collection: 'inquiry-deletions',
    data: {
      inquiryId: Number(doc.id),
      number: typeof doc.number === 'string' ? doc.number : null,
      // No panel user = the daily retention job (`lib/inquiry/retention`).
      reason: user ? 'request' : 'retention',
      deletedBy: user?.id ?? null,
      deletedByEmail: user?.email ?? null,
    },
    overrideAccess: true,
    depth: 0,
    req,
  })
}

/**
 * Inquiries from the site (ADR-G005). Written only by `submitInquiry()` (`lib/inquiry`) through
 * the Local API — the REST API cannot create, and nothing public can read. In the panel only the
 * status changes. Fields 1:1 with the future Django model (migration in 2027).
 */
export const Inquiries: CollectionConfig = {
  slug: 'inquiries',
  labels: { singular: 'Zapytanie', plural: 'Zapytania' },
  admin: {
    group: GROUP_SALES,
    useAsTitle: 'number',
    defaultColumns: ['number', 'createdAt', 'type', 'name', 'priceAtInquiry', 'status'],
    listSearchableFields: ['number', 'name', 'email'],
    description: 'Zapytania ze strony. Zmieniasz tylko status.',
  },
  defaultSort: '-createdAt',
  access: { read: panelOnly, create: nobody, update: panelOnly, delete: panelOnly },
  hooks: {
    beforeChange: [assignNumber, trackStatusChange],
    afterDelete: [recordDeletion],
  },
  fields: [
    {
      type: 'row',
      fields: [
        { name: 'number', label: 'Numer', type: 'text', unique: true, index: true, ...locked },
        {
          name: 'type',
          label: 'Rodzaj',
          type: 'select',
          required: true,
          options: options(INQUIRY_TYPE_CHOICES),
          ...locked,
        },
        {
          name: 'status',
          label: 'Status',
          type: 'select',
          required: true,
          defaultValue: 'new',
          index: true,
          options: options(INQUIRY_STATUS_CHOICES),
        },
      ],
    },
    {
      name: 'statusChangedAt',
      label: 'Ostatnia zmiana statusu',
      type: 'date',
      admin: {
        readOnly: true,
        position: 'sidebar',
        date: { pickerAppearance: 'dayAndTime' },
        description: 'Od tej daty liczy się okres przechowywania zamkniętych zapytań.',
      },
      access: { update: () => false },
    },
    {
      type: 'collapsible',
      label: 'Komputer',
      fields: [
        { name: 'build', label: 'Zestaw', type: 'relationship', relationTo: 'builds', ...locked },
        {
          name: 'config',
          label: 'Konfiguracja (kody)',
          type: 'group',
          fields: [
            {
              type: 'row',
              fields: [
                text('level', 'Poziom mocy'),
                text('case', 'Obudowa'),
                text('cooler', 'Chłodzenie'),
                text('ram', 'RAM'),
                text('ssd', 'Dysk'),
              ],
            },
          ],
        },
        {
          type: 'row',
          fields: [
            {
              name: 'priceAtInquiry',
              label: 'Cena w chwili zapytania (zł)',
              type: 'number',
              admin: {
                readOnly: true,
                description: 'Policzona przez serwer z opublikowanych cen.',
              },
              access: { update: () => false },
            },
            {
              name: 'priceBatch',
              label: 'Partia cen',
              type: 'number',
              ...locked,
            },
          ],
        },
        {
          type: 'row',
          fields: [select('forWhom', 'Dla kogo'), select('budget', 'Budżet')],
        },
        { name: 'customList', label: 'Własna lista', type: 'textarea', ...locked },
      ],
    },
    {
      type: 'collapsible',
      label: 'Gry i wygląd',
      fields: [
        {
          name: 'games',
          label: 'Gry',
          type: 'relationship',
          relationTo: 'games',
          hasMany: true,
          ...locked,
        },
        text('otherGames', 'Inne gry albo programy'),
        {
          type: 'row',
          fields: [
            select('monitor', 'Monitor'),
            select('refresh', 'Odświeżanie'),
            select('caseColor', 'Obudowa'),
            select('lighting', 'Podświetlenie'),
          ],
        },
        select('extras', 'Potrzebujesz też', true),
      ],
    },
    {
      type: 'collapsible',
      label: 'Kontakt',
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'name', label: 'Imię', type: 'text', required: true, ...locked },
            { name: 'email', label: 'E-mail', type: 'email', required: true, ...locked },
            text('phone', 'Telefon'),
            select('preferredContact', 'Odpowiedź'),
          ],
        },
        {
          type: 'row',
          fields: [select('pickup', 'Odbiór'), select('invoice', 'Faktura'), text('nip', 'NIP')],
        },
        { name: 'message', label: 'Uwagi', type: 'textarea', ...locked },
      ],
    },
    {
      type: 'collapsible',
      label: 'Zgody i źródło',
      admin: { initCollapsed: true },
      fields: [
        {
          name: 'consent',
          label: 'Zgoda RODO',
          type: 'group',
          fields: [
            {
              type: 'row',
              fields: [
                { name: 'accepted', label: 'Udzielona', type: 'checkbox', ...locked },
                text('clauseVersion', 'Wersja klauzuli'),
                {
                  name: 'acceptedAt',
                  label: 'Kiedy',
                  type: 'date',
                  admin: { readOnly: true, date: { pickerAppearance: 'dayAndTime' } },
                  access: { update: () => false },
                },
              ],
            },
          ],
        },
        {
          name: 'marketingConsent',
          label: 'Zgoda marketingowa',
          type: 'checkbox',
          defaultValue: false,
          ...locked,
        },
        {
          name: 'source',
          label: 'Źródło',
          type: 'group',
          fields: [
            text('url', 'Strona'),
            {
              type: 'row',
              fields: [
                text('utmSource', 'UTM source'),
                text('utmMedium', 'UTM medium'),
                text('utmCampaign', 'UTM campaign'),
              ],
            },
          ],
        },
      ],
    },
  ],
}
