import type { CollectionBeforeChangeHook, CollectionConfig } from 'payload'

import { staffField, staffOrOwnRecords } from '../access/customer'
import { adminOnly, staffOnly } from '../access/panel'
import { generateUnitCode } from '../lib/units'
import { blockDeleteWhenReferenced } from './workshopGuards'
import { GROUP_WORKSHOP, normalizeEmailHook, RESOLUTIONS } from './shared'

/** Parts on the certificate (board Metryka, „Części i gwarancje”). */
export const UNIT_PART_ROLES = [
  { value: 'gpu', label: 'Karta graficzna' },
  { value: 'cpu', label: 'Procesor' },
  { value: 'motherboard', label: 'Płyta główna' },
  { value: 'ram', label: 'Pamięć' },
  { value: 'ssd', label: 'Dysk' },
  { value: 'psu', label: 'Zasilacz' },
  { value: 'case', label: 'Obudowa' },
  { value: 'cooler', label: 'Chłodzenie' },
] as const

/**
 * New unit: random certificate code (ADR-G005, `lib/units.ts`) and the next unit number of its
 * build („Wampir, egzemplarz nr 7”). Both stay as they are afterwards — the code is printed on the
 * sticker.
 */
const assignCodeAndNumber: CollectionBeforeChangeHook = async ({ data, operation, req }) => {
  if (operation !== 'create') return data
  const next = { ...data }
  if (!next.code) next.code = generateUnitCode()
  if (!next.number && next.build) {
    const last = await req.payload.find({
      collection: 'units',
      where: { build: { equals: next.build } },
      sort: '-number',
      limit: 1,
      depth: 0,
      select: { number: true },
      overrideAccess: true,
      req,
    })
    next.number = (last.docs[0]?.number ?? 0) + 1
  }
  return next
}

// Set only by the system (hook below): a code outside the pattern would make the certificate
// unreachable. Field access drops a value sent through the API; the collection hook runs after.
const locked = {
  access: { create: () => false, update: () => false },
  admin: { readOnly: true },
} as const

/**
 * Units = built computers with their certificate (ADR-G005). The service fills them in the panel;
 * the public sees a unit only through `/metryka/<code>` (server-side, published only, without the
 * customer). A verified customer reads their own units (by e-mail) in the account.
 */
export const Units: CollectionConfig = {
  slug: 'units',
  labels: { singular: 'Egzemplarz', plural: 'Egzemplarze' },
  admin: {
    group: GROUP_WORKSHOP,
    useAsTitle: 'code',
    defaultColumns: ['code', 'build', 'number', 'testedAt', 'published'],
    listSearchableFields: ['code', 'serial', 'email'],
    description:
      'Egzemplarze z metryką. Kod nadaje się sam przy zapisie — drukujesz go na naklejce.',
  },
  defaultSort: '-createdAt',
  access: { read: staffOrOwnRecords, create: staffOnly, update: staffOnly, delete: adminOnly },
  indexes: [{ fields: ['build', 'number'], unique: true }],
  hooks: {
    beforeChange: [assignCodeAndNumber],
    beforeDelete: [blockDeleteWhenReferenced('tickets', 'unit', 'zgłoszenia tego egzemplarza')],
  },
  fields: [
    {
      type: 'row',
      fields: [
        { name: 'code', label: 'Kod metryki', type: 'text', unique: true, index: true, ...locked },
        {
          name: 'build',
          label: 'Zestaw',
          type: 'relationship',
          relationTo: 'builds',
          required: true,
        },
        { name: 'number', label: 'Egzemplarz nr', type: 'number', min: 1, ...locked },
        {
          name: 'published',
          label: 'Metryka opublikowana',
          type: 'checkbox',
          defaultValue: false,
          admin: { description: 'Dopiero wtedy działa adres /metryka/<kod>.' },
        },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'serial', label: 'Numer seryjny komputera', type: 'text', maxLength: 60 },
        { name: 'testedAt', label: 'Data testu', type: 'date' },
        { name: 'warrantyUntil', label: 'Gwarancja PRO-KOM do', type: 'date' },
        {
          name: 'assembledBy',
          label: 'Złożył i przetestował (imię)',
          type: 'text',
          maxLength: 60,
          admin: { description: 'Tylko za zgodą osoby. Puste = na metryce bez imienia.' },
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'email',
          label: 'E-mail klienta',
          type: 'email',
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
      name: 'stressTest',
      label: 'Test obciążeniowy',
      type: 'group',
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'minutes', label: 'Czas (min)', type: 'number', min: 0 },
            { name: 'errors', label: 'Błędy (0 = bez błędów)', type: 'number', min: 0 },
          ],
        },
      ],
    },
    {
      name: 'temps',
      label: 'Temperatury maks. (°C)',
      type: 'group',
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'cpuMax', label: 'CPU', type: 'number', min: 0, max: 120 },
            { name: 'gpuMax', label: 'GPU', type: 'number', min: 0, max: 120 },
          ],
        },
      ],
    },
    {
      name: 'fpsSetup',
      label: 'Pomiar klatek',
      type: 'group',
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'resolution',
              label: 'Rozdzielczość',
              type: 'select',
              defaultValue: 'qhd',
              options: RESOLUTIONS,
            },
            {
              name: 'settings',
              label: 'Ustawienia',
              type: 'text',
              defaultValue: 'wysokie',
              maxLength: 40,
            },
            { name: 'driver', label: 'Sterownik (wersja)', type: 'text', maxLength: 40 },
          ],
        },
      ],
    },
    {
      name: 'fps',
      label: 'Klatki zmierzone na tym egzemplarzu',
      type: 'array',
      maxRows: 3,
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'game',
              label: 'Gra',
              type: 'relationship',
              relationTo: 'games',
              required: true,
            },
            { name: 'fps', label: 'Średnio FPS', type: 'number', required: true, min: 1 },
          ],
        },
      ],
    },
    {
      name: 'parts',
      label: 'Części i gwarancje',
      type: 'array',
      maxRows: 12,
      admin: {
        description:
          'Na metryce widać producenta, model i numer seryjny tego egzemplarza (spec. §13) — to jedyne miejsce na stronie z modelem części.',
      },
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'role',
              label: 'Rodzaj',
              type: 'select',
              required: true,
              options: UNIT_PART_ROLES.map(({ value, label }) => ({ value, label })),
            },
            {
              name: 'label',
              label: 'Nazwa na metryce',
              type: 'text',
              required: true,
              maxLength: 80,
            },
            { name: 'manufacturer', label: 'Producent', type: 'text', maxLength: 40 },
            { name: 'model', label: 'Model', type: 'text', maxLength: 80 },
          ],
        },
        {
          type: 'row',
          fields: [
            { name: 'serial', label: 'Numer seryjny', type: 'text', maxLength: 60 },
            { name: 'warrantyUntil', label: 'Gwarancja producenta do', type: 'date' },
          ],
        },
      ],
    },
  ],
}
