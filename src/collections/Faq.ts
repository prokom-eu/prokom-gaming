import type { CollectionConfig } from 'payload'

import { anyone, panelOnly } from '../access/panel'
import { GROUP_CONTENT } from './shared'

/**
 * Groups of questions (spec. §19: five groups of `/pytania`) plus the six questions of the home
 * page section "Zanim zapytasz" (spec. §4 pt 12) — separate wording, never shown on `/pytania`.
 */
export const FAQ_GROUPS = [
  { label: 'Zakup i płatność', value: 'purchase' },
  { label: 'Dostawa i odbiór', value: 'delivery' },
  { label: 'Zwroty i gwarancja', value: 'returns' },
  { label: 'Technika i klatki', value: 'tech' },
  { label: 'Dla rodziców', value: 'parents' },
  { label: 'Na stronie głównej', value: 'home' },
] as const

export type FaqGroup = (typeof FAQ_GROUPS)[number]['value']

/** Questions and answers shown on the site (seed: `seed/prokomgaming/faq.json`). */
export const Faq: CollectionConfig = {
  slug: 'faq',
  labels: { singular: 'Pytanie', plural: 'Pytania' },
  admin: {
    group: GROUP_CONTENT,
    useAsTitle: 'question',
    defaultColumns: ['question', 'group', 'order'],
  },
  defaultSort: 'order',
  access: { read: anyone, create: panelOnly, update: panelOnly, delete: panelOnly },
  fields: [
    { name: 'question', label: 'Pytanie', type: 'text', required: true },
    { name: 'answer', label: 'Odpowiedź', type: 'textarea', required: true },
    {
      type: 'row',
      fields: [
        {
          name: 'group',
          label: 'Grupa',
          type: 'select',
          required: true,
          index: true,
          options: [...FAQ_GROUPS],
          admin: {
            description: '„Na stronie głównej” = sekcja „Zanim zapytasz” na głównej, nie /pytania.',
          },
        },
        {
          name: 'order',
          label: 'Kolejność w grupie',
          type: 'number',
          required: true,
          min: 1,
        },
      ],
    },
  ],
}
