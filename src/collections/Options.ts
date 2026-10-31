import type { Access, CollectionConfig, Condition } from 'payload'

import { number, select } from 'payload/shared'

import { adminField, adminOnly, isAdmin } from '../access/panel'
import { GROUP_OFFER, RAM_TYPES, requiredFor, requiredWhen } from './shared'
import type { Option } from '../payload-types'
import { queueAlarmOnCostChange } from './marginAlarmHook'
import { blockDeactivateWhenUsed, blockDeleteWhenUsed } from './usage'

const forTypes =
  (...types: string[]): Condition =>
  (_data, siblingData) =>
    types.includes((siblingData as { type?: string }).type ?? '')

const isCooler =
  (kind: 'air' | 'aio360') =>
  (s: { type?: string; kind?: string }): boolean =>
    s.type === 'cooler' && s.kind === kind

const forCooler =
  (kind: 'air' | 'aio360'): Condition =>
  (_data, siblingData) =>
    isCooler(kind)(siblingData as { type?: string; kind?: string })

// Visitors see only active options; the panel sees all of them.
const readActive: Access = ({ req }) => isAdmin(req) || { active: { equals: true } }

/**
 * Options of the configurator: cases (24), coolers (22), RAM (7), SSDs (4) — ADR-G002 §2.
 * Cases and coolers are shown with their full name and photo; RAM and SSDs only by class. The
 * internal model, EAN and cost exist only in the panel (field access, ADR-G002 §8.7).
 */
export const Options: CollectionConfig = {
  slug: 'options',
  labels: { singular: 'Opcja', plural: 'Opcje' },
  admin: {
    group: GROUP_OFFER,
    useAsTitle: 'publicLabel',
    defaultColumns: ['code', 'type', 'publicLabel', 'active'],
    listSearchableFields: ['code', 'publicLabel'],
  },
  defaultSort: 'code',
  access: { read: readActive, create: adminOnly, update: adminOnly, delete: adminOnly },
  hooks: {
    afterChange: [queueAlarmOnCostChange<Option>((o) => String(o.cost))],
    beforeChange: [blockDeactivateWhenUsed],
    beforeDelete: [
      blockDeleteWhenUsed(
        ['case', 'cooler', 'ram', 'ssd'],
        'Zmień najpierw zestaw; opcję, której nie sprzedajemy, wyłącz („Aktywna”).',
      ),
    ],
  },
  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'type',
          label: 'Typ',
          type: 'select',
          required: true,
          options: [
            { label: 'Obudowa', value: 'case' },
            { label: 'Chłodzenie', value: 'cooler' },
            { label: 'RAM', value: 'ram' },
            { label: 'Dysk', value: 'ssd' },
          ],
        },
        { name: 'code', label: 'Kod', type: 'text', required: true, unique: true },
        { name: 'active', label: 'Aktywna', type: 'checkbox', defaultValue: true },
      ],
    },
    {
      name: 'publicLabel',
      label: 'Nazwa na stronie',
      type: 'text',
      required: true,
      admin: { description: 'Obudowy i chłodzenia z producentem; RAM i dyski tylko klasa.' },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'internalModel',
          label: 'Model wewnętrzny (tylko panel)',
          type: 'text',
          required: true,
          ...adminField,
        },
        { name: 'ean', label: 'EAN (tylko panel)', type: 'text', ...adminField },
        {
          name: 'cost',
          label: 'Koszt zł (tylko panel)',
          type: 'number',
          required: true,
          min: 0,
          ...adminField,
        },
      ],
    },
    {
      name: 'image',
      label: 'Zdjęcie',
      type: 'upload',
      relationTo: 'media',
      admin: { condition: forTypes('case', 'cooler') },
    },
    { name: 'description', label: 'Opis', type: 'text' },
    // Case
    {
      type: 'row',
      fields: [
        {
          name: 'gpuMaxMm',
          label: 'Maks. długość karty (mm)',
          type: 'number',
          min: 0,
          validate: requiredFor(['case'], number),
          admin: { condition: forTypes('case') },
        },
        {
          name: 'coolerMaxMm',
          label: 'Maks. wysokość chłodzenia (mm)',
          type: 'number',
          min: 0,
          validate: requiredFor(['case'], number),
          admin: { condition: forTypes('case') },
        },
        {
          name: 'aio360',
          label: 'Miejsce na AIO 360',
          type: 'select',
          options: [
            { label: 'Brak', value: 'none' },
            { label: 'Przód', value: 'front' },
            { label: 'Tylko góra', value: 'top_only' },
            { label: 'Bok', value: 'side' },
            { label: 'Tak', value: 'yes' },
          ],
          validate: requiredFor(['case'], select),
          admin: { condition: forTypes('case') },
        },
      ],
    },
    // Cooler
    {
      type: 'row',
      fields: [
        {
          name: 'kind',
          label: 'Rodzaj',
          type: 'select',
          options: [
            { label: 'Powietrze', value: 'air' },
            { label: 'AIO 360', value: 'aio360' },
          ],
          validate: requiredFor(['cooler'], select),
          admin: { condition: forTypes('cooler') },
        },
        {
          name: 'heightMm',
          label: 'Wysokość (mm)',
          type: 'number',
          min: 0,
          // Compatibility rules (G4) compare it with the case clearance.
          validate: requiredWhen(isCooler('air'), number),
          admin: { condition: forCooler('air') },
        },
        {
          name: 'radiatorThicknessMm',
          label: 'Grubość chłodnicy (mm)',
          type: 'number',
          min: 0,
          validate: requiredWhen(isCooler('aio360'), number),
          admin: { condition: forCooler('aio360') },
        },
      ],
    },
    // Case and cooler
    {
      type: 'row',
      fields: [
        {
          name: 'class',
          label: 'Klasa (1–3)',
          type: 'number',
          min: 1,
          max: 3,
          validate: requiredFor(['case', 'cooler'], number),
          admin: { condition: forTypes('case', 'cooler') },
        },
        {
          name: 'color',
          label: 'Kolor',
          type: 'select',
          options: ['czarny', 'szary', 'biały'],
          admin: { condition: forTypes('case', 'cooler') },
        },
      ],
    },
    // RAM and SSD
    {
      type: 'row',
      fields: [
        {
          name: 'ramType',
          label: 'Typ pamięci',
          type: 'select',
          options: RAM_TYPES,
          validate: requiredFor(['ram'], select),
          admin: { condition: forTypes('ram') },
        },
        {
          name: 'capacityGb',
          label: 'Pojemność (GB)',
          type: 'number',
          min: 0,
          validate: requiredFor(['ram', 'ssd'], number),
          admin: { condition: forTypes('ram', 'ssd') },
        },
      ],
    },
  ],
}
