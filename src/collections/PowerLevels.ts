import type { CollectionConfig } from 'payload'

import { anyone, panelField, panelOnly } from '../access/panel'
import { GROUP_OFFER, MARKUP_CLASSES, RAM_TYPES, RESOLUTIONS } from './shared'
import type { PowerLevel } from '../payload-types'
import { queueAlarmOnCostChange } from './marginAlarmHook'
import { blockDeleteWhenUsed } from './usage'

const CLASS_1_3 = { type: 'number', required: true, min: 1, max: 3 } as const

/**
 * Power levels P01–P16: CPU + GPU + motherboard + PSU package (ADR-G002 §2). The site shows only
 * `publicLabel` classes; parts with internal models and costs, EANs and markups exist only in the
 * panel (field access, ADR-G002 §8.7). Its price comes from published prices, never from here.
 */
export const PowerLevels: CollectionConfig = {
  slug: 'power-levels',
  labels: { singular: 'Poziom mocy', plural: 'Poziomy mocy' },
  admin: {
    group: GROUP_OFFER,
    useAsTitle: 'code',
    defaultColumns: ['code', 'tierRoman', 'tierLabel', 'variant', 'publicLabel'],
    listSearchableFields: ['code', 'publicLabel', 'tierLabel'],
  },
  defaultSort: 'code',
  access: { read: anyone, create: panelOnly, update: panelOnly, delete: panelOnly },
  hooks: {
    afterChange: [
      queueAlarmOnCostChange<PowerLevel>((l) =>
        (l.components ?? []).map((c) => `${c.internalModel}:${c.cost}`).join('|'),
      ),
    ],
    beforeDelete: [blockDeleteWhenUsed(['level'], 'Zmień najpierw poziom w tym zestawie.')],
  },
  fields: [
    { name: 'code', label: 'Kod', type: 'text', required: true, unique: true },
    {
      type: 'row',
      fields: [
        {
          name: 'tier',
          label: 'Stopień mocy (1–9)',
          type: 'number',
          required: true,
          min: 1,
          max: 9,
        },
        { name: 'tierRoman', label: 'Stopień rzymski', type: 'text', required: true },
        { name: 'tierLabel', label: 'Kraina', type: 'text', required: true },
      ],
    },
    {
      name: 'tierLead',
      label: 'Reprezentuje swój stopień w tabelach 9 wierszy',
      type: 'checkbox',
      defaultValue: false,
    },
    {
      type: 'row',
      fields: [
        {
          name: 'targetResolution',
          label: 'Rozdzielczość poziomu',
          type: 'select',
          required: true,
          options: RESOLUTIONS,
        },
        {
          name: 'monitorFilters',
          label: 'Filtry „Monitor”',
          type: 'select',
          hasMany: true,
          required: true,
          options: RESOLUTIONS,
        },
      ],
    },
    {
      name: 'variant',
      label: 'Wariant',
      type: 'select',
      options: ['GeForce', 'Radeon', 'Intel', 'biały GeForce', 'biały Radeon', 'premium'],
    },
    {
      name: 'publicLabel',
      label: 'Opis na stronie (bez producentów)',
      type: 'text',
      required: true,
    },
    {
      type: 'row',
      fields: [
        {
          name: 'platform',
          label: 'Platforma',
          type: 'select',
          required: true,
          options: ['AM4', 'AM5', 'LGA1700', 'LGA1851'],
        },
        { name: 'ramType', label: 'Pamięć', type: 'select', required: true, options: RAM_TYPES },
        {
          name: 'color',
          label: 'Kolor',
          type: 'select',
          required: true,
          options: ['czarny', 'biały'],
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'gpuLengthMm',
          label: 'Długość karty (mm)',
          type: 'number',
          required: true,
          min: 0,
        },
        { name: 'requiresAio', label: 'Wymaga AIO 360', type: 'checkbox', defaultValue: false },
      ],
    },
    {
      name: 'components',
      label: 'Części (tylko panel)',
      type: 'array',
      ...panelField,
      fields: [
        {
          name: 'role',
          label: 'Rola',
          type: 'select',
          required: true,
          options: [
            { label: 'Procesor', value: 'cpu' },
            { label: 'Karta graficzna', value: 'gpu' },
            { label: 'Płyta główna', value: 'mobo' },
            { label: 'Zasilacz', value: 'psu' },
          ],
        },
        { name: 'publicLabel', label: 'Klasa na stronie', type: 'text', required: true },
        {
          name: 'internalModel',
          label: 'Model wewnętrzny',
          type: 'text',
          required: true,
          ...panelField,
        },
        { name: 'ean', label: 'EAN', type: 'text', ...panelField },
        {
          name: 'cost',
          label: 'Koszt (zł)',
          type: 'number',
          required: true,
          min: 0,
          ...panelField,
        },
      ],
    },
    {
      name: 'upgrade',
      label: 'Miejsce na rozbudowę',
      type: 'group',
      admin: {
        description:
          'Wartości z planszy — potwierdzić z modelem płyty (część „Płyta główna”) przed publikacją kart.',
      },
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'freeRamSlots', label: 'Wolne gniazda RAM', type: 'number', min: 0 },
            { name: 'freeM2Slots', label: 'Wolne gniazda M.2', type: 'text' },
            { name: 'psuW', label: 'Moc zasilacza (W)', type: 'number', min: 0 },
          ],
        },
        { name: 'socket', label: 'Gniazdo procesora', type: 'text' },
        { name: 'socketNote', label: 'Uwaga o gnieździe', type: 'text' },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'markupClass',
          label: 'Klasa narzutu (tylko panel)',
          type: 'select',
          required: true,
          options: MARKUP_CLASSES,
          ...panelField,
        },
        {
          name: 'markupOverride',
          label: 'Wyjątek narzutu (tylko panel)',
          type: 'number',
          min: 0,
          max: 1,
          admin: { description: 'Jawny wyjątek od klasy, np. 0,168. Puste = narzut klasy.' },
          ...panelField,
        },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'minRamGb', label: 'Min. RAM (GB)', type: 'number', required: true, min: 0 },
        { name: 'minSsdGb', label: 'Min. dysk (GB)', type: 'number', required: true, min: 0 },
        {
          name: 'minCoolerClass',
          label: 'Min. klasa chłodzenia',
          ...CLASS_1_3,
          admin: { description: '1 podst. powietrze, 2 wieża, 3 AIO 360' },
        },
        {
          name: 'minCaseClass',
          label: 'Min. klasa obudowy',
          ...CLASS_1_3,
          admin: { description: '1 podst., 2 średnia, 3 premium' },
        },
      ],
    },
    {
      name: 'leadBuild',
      label: 'Zestaw wiodący',
      type: 'relationship',
      relationTo: 'builds',
      admin: { description: 'Klatki poziomu = klatki tego zestawu (ADR-G004).' },
    },
  ],
}
