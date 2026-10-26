import type { CollectionConfig } from 'payload'
import { text } from 'payload/shared'

import { anyone, panelOnly } from '../access/panel'
import { blockDeleteWithFpsResults } from './FpsResults'
import { GAME_KINDS, GROUP_GAMES } from './shared'

/** Lowercase letters, digits and single hyphens: the slug becomes `/komputer-do/<slug>` (G11). */
export const slugText: typeof text = (value, options) => {
  if (typeof value === 'string' && value !== '' && !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(value)) {
    return 'Tylko małe litery bez polskich znaków, cyfry i pojedyncze myślniki, np. „gta-v”.'
  }
  return text(value, options)
}

/**
 * The 33 games the site shows FPS for (ADR-G004 §5). Order on the site = `popularRank`.
 * Manufacturer requirements stay empty until filled from the game's page; the site hides that
 * block while they are empty (spec. §8).
 */
export const Games: CollectionConfig = {
  slug: 'games',
  labels: { singular: 'Gra', plural: 'Gry' },
  admin: {
    group: GROUP_GAMES,
    useAsTitle: 'name',
    defaultColumns: ['name', 'kind', 'popularRank', 'seoPage'],
  },
  defaultSort: 'popularRank',
  access: { read: anyone, create: panelOnly, update: panelOnly, delete: panelOnly },
  hooks: { beforeDelete: [blockDeleteWithFpsResults('game')] },
  fields: [
    {
      type: 'row',
      fields: [
        { name: 'name', label: 'Nazwa', type: 'text', required: true, unique: true },
        {
          name: 'slug',
          label: 'Adres (slug)',
          type: 'text',
          required: true,
          unique: true,
          validate: slugText,
          admin: { description: '/komputer-do/<slug>' },
        },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'kind', label: 'Rodzaj', type: 'select', required: true, options: GAME_KINDS },
        {
          name: 'fpsCap',
          label: 'Limit klatek gry',
          type: 'number',
          min: 1,
          admin: { description: 'Tylko gry z limitem, np. Elden Ring: 60.' },
        },
        {
          name: 'popularRank',
          label: 'Kolejność (popularność)',
          type: 'number',
          required: true,
          min: 1,
        },
      ],
    },
    { name: 'setting', label: 'Ustawienia w testach', type: 'text', required: true },
    {
      name: 'settingNote',
      label: 'Dopisek przy grze na stronie',
      type: 'text',
      admin: {
        description:
          'Tylko gdy ustawienia odbiegają od standardu (np. „ze skalowaniem DLSS/FSR Balanced”). Puste = brak dopisku (ADR-G004 §6).',
      },
    },
    {
      name: 'seoPage',
      label: 'Strona /komputer-do/<slug>',
      type: 'checkbox',
      defaultValue: true,
    },
    {
      name: 'requirements',
      label: 'Wymagania producenta',
      type: 'group',
      admin: { description: 'Ze strony gry, z datą sprawdzenia. Puste = blok ukryty na stronie.' },
      fields: [
        { name: 'min', label: 'Minimalne', type: 'textarea' },
        { name: 'recommended', label: 'Zalecane', type: 'textarea' },
        { name: 'max', label: 'Najwyższe', type: 'textarea' },
        {
          type: 'row',
          fields: [
            { name: 'source', label: 'Źródło (adres)', type: 'text' },
            { name: 'checkedAt', label: 'Sprawdzone', type: 'date' },
          ],
        },
      ],
    },
  ],
}
