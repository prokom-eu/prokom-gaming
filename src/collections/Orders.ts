import type { CollectionBeforeChangeHook, CollectionConfig } from 'payload'

import { staffField, staffOrOwnRecords } from '../access/customer'
import { adminOnly, isPanelUser, staffOnly } from '../access/panel'
import { nextYearlySeq, yearInPoland } from '../lib/inquiry/number'
import {
  CHECKLIST_ITEMS,
  formatOrderNumber,
  isOrderStage,
  ORDER_STAGE_CHOICES,
} from '../lib/orders'
import { GROUP_WORKSHOP, normalizeEmailHook } from './shared'

type StageEntry = { stage: string; at: string; by?: number | null }
type ChecklistEntry = {
  key?: string
  done?: boolean | null
  doneAt?: string | null
  doneBy?: number | { id: number } | null
}

const idOf = (value: number | { id: number } | null | undefined) =>
  typeof value === 'object' && value !== null ? value.id : (value ?? null)

/** Number `Z-RRRR-NNNN` from the yearly counter, in the insert's transaction (like inquiries). */
const assignNumber: CollectionBeforeChangeHook = async ({ data, operation, req }) => {
  if (operation !== 'create' || data.number) return data
  const year = yearInPoland(new Date())
  return {
    ...data,
    number: formatOrderNumber(year, await nextYearlySeq(req, 'order_counters', year)),
  }
}

/**
 * Every stage change is appended to `stageHistory` with who and when (panel spec §7), and
 * `stageChangedAt` is when the current stage began (time in stage, strip on the home page).
 */
const trackStage: CollectionBeforeChangeHook = ({ data, operation, originalDoc, req }) => {
  if (operation !== 'create' && operation !== 'update') return data
  const stage = data.stage ?? originalDoc?.stage
  if (!isOrderStage(stage)) return data
  const previous = operation === 'update' ? originalDoc?.stage : undefined
  if (stage === previous) return data
  const at = new Date().toISOString()
  const history: StageEntry[] = [...((originalDoc?.stageHistory as StageEntry[]) ?? [])]
  history.push({ stage, at, by: isPanelUser(req) ? (req.user?.id as number) : null })
  return { ...data, stage, stageChangedAt: at, stageHistory: history }
}

/** Ticking a checklist item records when and by whom; unticking clears both. */
const stampChecklist: CollectionBeforeChangeHook = ({ data, originalDoc, req }) => {
  if (!Array.isArray(data.checklist)) return data
  const before = new Map(
    ((originalDoc?.checklist as ChecklistEntry[]) ?? []).map((c) => [c.key, c]),
  )
  const userId = isPanelUser(req) ? (req.user?.id as number) : null
  const checklist = (data.checklist as ChecklistEntry[]).map((item) => {
    const old = before.get(item.key)
    if (!item.done) return { ...item, done: false, doneAt: null, doneBy: null }
    if (old?.done) return { ...item, doneAt: old.doneAt ?? null, doneBy: idOf(old.doneBy) }
    return { ...item, doneAt: new Date().toISOString(), doneBy: userId }
  })
  return { ...data, checklist }
}

const readOnly = { admin: { readOnly: true } } as const

/**
 * Orders (ADR-G005): an accepted offer turned into a computer to build. The panel (Krystian, P5
 * board) creates them; the service moves the stages. Public: only the workshop strip (build name,
 * colour, stage — `lib/workshop.server.ts`). A verified customer reads their own orders (by e-mail)
 * in the account, without internal fields.
 */
export const Orders: CollectionConfig = {
  slug: 'orders',
  labels: { singular: 'Zamówienie', plural: 'Zamówienia' },
  admin: {
    group: GROUP_WORKSHOP,
    useAsTitle: 'number',
    defaultColumns: ['number', 'build', 'name', 'stage', 'dueDate'],
    listSearchableFields: ['number', 'name', 'email'],
  },
  defaultSort: '-createdAt',
  access: { read: staffOrOwnRecords, create: staffOnly, update: staffOnly, delete: adminOnly },
  hooks: { beforeChange: [assignNumber, trackStage, stampChecklist] },
  fields: [
    {
      type: 'row',
      fields: [
        { name: 'number', label: 'Numer', type: 'text', unique: true, index: true, ...readOnly },
        {
          name: 'stage',
          label: 'Etap',
          type: 'select',
          required: true,
          defaultValue: 'offer',
          options: ORDER_STAGE_CHOICES.map(({ value, label }) => ({ value, label })),
        },
        { name: 'dueDate', label: 'Termin (wysyłka planowana)', type: 'date' },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'name', label: 'Imię klienta', type: 'text', required: true, maxLength: 80 },
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
        {
          name: 'inquiry',
          label: 'Zapytanie',
          type: 'relationship',
          relationTo: 'inquiries',
          ...staffField,
        },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'build', label: 'Zestaw', type: 'relationship', relationTo: 'builds' },
        { name: 'price', label: 'Cena (zł brutto)', type: 'number', min: 0 },
        { name: 'unit', label: 'Egzemplarz', type: 'relationship', relationTo: 'units' },
        { name: 'trackingNumber', label: 'Numer przesyłki', type: 'text', maxLength: 60 },
      ],
    },
    {
      name: 'config',
      label: 'Konfiguracja (kody)',
      type: 'group',
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'level', label: 'Poziom mocy', type: 'text' },
            { name: 'case', label: 'Obudowa', type: 'text' },
            { name: 'cooler', label: 'Chłodzenie', type: 'text' },
            { name: 'ram', label: 'RAM', type: 'text' },
            { name: 'ssd', label: 'Dysk', type: 'text' },
          ],
        },
      ],
    },
    {
      name: 'checklist',
      label: 'Lista kontrolna serwisu',
      type: 'array',
      ...staffField,
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'key',
              label: 'Punkt',
              type: 'select',
              required: true,
              options: CHECKLIST_ITEMS.map(({ value, label }) => ({ value, label })),
            },
            { name: 'done', label: 'Zrobione', type: 'checkbox', defaultValue: false },
            { name: 'doneAt', label: 'Kiedy', type: 'date', ...readOnly },
            {
              name: 'doneBy',
              label: 'Kto',
              type: 'relationship',
              relationTo: 'users',
              ...readOnly,
            },
          ],
        },
      ],
    },
    { name: 'workshopNote', label: 'Notatka warsztatu', type: 'textarea', ...staffField },
    { name: 'stageChangedAt', label: 'Etap od', type: 'date', ...readOnly },
    {
      name: 'stageHistory',
      label: 'Historia etapów',
      type: 'array',
      ...readOnly,
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'stage',
              label: 'Etap',
              type: 'select',
              required: true,
              options: ORDER_STAGE_CHOICES.map(({ value, label }) => ({ value, label })),
            },
            { name: 'at', label: 'Kiedy', type: 'date', required: true },
            { name: 'by', label: 'Kto', type: 'relationship', relationTo: 'users', ...staffField },
          ],
        },
      ],
    },
  ],
}
