import type { CollectionConfig, Field } from 'payload'

import { anyone, panelField, panelOnly } from '../access/panel'
import { blockDeleteWithFpsResults } from './FpsResults'
import { GROUP_OFFER } from './shared'

const optionOf = (name: string, label: string, type: string): Field => ({
  name,
  label,
  type: 'relationship',
  relationTo: 'options',
  required: true,
  // Active only: the margin guard reviews active options, so a build with an inactive one would
  // drop out of it (the other side: `blockDeactivateWhenUsed` in `usage.ts`). Payload also
  // checks `filterOptions` when saving.
  filterOptions: { type: { equals: type }, active: { equals: true } },
})

/**
 * Ready builds = saved configurator recipes (ADR-G002 §2). **No price field**: the price is always
 * computed from the published prices of its level and four options. Creature texts come 1:1 from
 * `seed/prokomgaming/creatures.json`; the creature colour lives only in `tokens.css`
 * (`--c-<slug>`, ADR-G003 §2) and sigil/scene files follow from `creature.key`.
 */
export const Builds: CollectionConfig = {
  slug: 'builds',
  labels: { singular: 'Zestaw', plural: 'Zestawy' },
  admin: {
    group: GROUP_OFFER,
    useAsTitle: 'name',
    defaultColumns: ['name', 'slug', 'level'],
  },
  access: { read: anyone, create: panelOnly, update: panelOnly, delete: panelOnly },
  hooks: { beforeDelete: [blockDeleteWithFpsResults('build')] },
  fields: [
    {
      type: 'row',
      fields: [
        { name: 'name', label: 'Nazwa', type: 'text', required: true },
        {
          name: 'slug',
          label: 'Adres (slug)',
          type: 'text',
          required: true,
          unique: true,
          admin: { description: '/zestawy/<slug>' },
        },
      ],
    },
    {
      name: 'level',
      label: 'Poziom mocy',
      type: 'relationship',
      relationTo: 'power-levels',
      required: true,
    },
    {
      type: 'row',
      fields: [
        optionOf('case', 'Obudowa', 'case'),
        optionOf('cooler', 'Chłodzenie', 'cooler'),
        optionOf('ram', 'RAM', 'ram'),
        optionOf('ssd', 'Dysk', 'ssd'),
      ],
    },
    {
      name: 'creature',
      label: 'Istota',
      type: 'group',
      fields: [
        {
          name: 'key',
          label: 'Klucz grafik',
          type: 'text',
          required: true,
          admin: {
            description: 'Nazwa plików pieczęci i scen w /public, np. „baba” dla Baby Jagi.',
          },
        },
        {
          type: 'row',
          fields: [
            { name: 'accusative', label: 'Biernik', type: 'text', required: true },
            { name: 'genitive', label: 'Dopełniacz', type: 'text', required: true },
            { name: 'epithet', label: 'Przydomek', type: 'text', required: true },
          ],
        },
        {
          type: 'row',
          fields: [
            {
              name: 'shell',
              label: 'Obudowa',
              type: 'select',
              required: true,
              options: [
                { label: 'Ciemna', value: 'dark' },
                { label: 'Biała', value: 'white' },
              ],
            },
            { name: 'biome', label: 'Krajobraz sceny', type: 'text', required: true },
            { name: 'look', label: 'Wygląd', type: 'text', required: true },
          ],
        },
        { name: 'short', label: 'Krótko', type: 'textarea', required: true },
        { name: 'motto', label: 'Motto', type: 'textarea', required: true },
        { name: 'myth', label: 'Z podań', type: 'textarea', required: true },
        { name: 'why', label: 'Dlaczego ta istota', type: 'textarea', required: true },
        { name: 'giftTitle', label: 'Dar — tytuł', type: 'text', required: true },
        { name: 'gift', label: 'Dar — opis', type: 'textarea', required: true },
        {
          name: 'heroTitle',
          label: 'Karta na głównej — nagłówek',
          type: 'text',
          required: true,
          admin: {
            description: 'Np. „4K na wysokich ustawieniach”. Karta istoty w hero strony głównej.',
          },
        },
        {
          name: 'heroText',
          label: 'Karta na głównej — opis',
          type: 'textarea',
          required: true,
          admin: {
            description:
              'Wymienia procesor i kartę z nazwy — zaktualizuj przy zmianie części poziomu mocy.',
          },
        },
        { name: 'legend', label: 'Legenda', type: 'textarea', required: true },
        {
          name: 'legendSource',
          label: 'Źródło legendy',
          type: 'group',
          fields: [
            {
              type: 'row',
              fields: [
                { name: 'title', label: 'Tytuł', type: 'text', required: true },
                { name: 'url', label: 'Adres', type: 'text', required: true },
              ],
            },
          ],
        },
      ],
    },
    {
      name: 'photos',
      label: 'Zdjęcia egzemplarza',
      type: 'upload',
      relationTo: 'media',
      hasMany: true,
      admin: { description: 'Tylko prawdziwe zdjęcia naszego egzemplarza (ADR-G003 §3).' },
    },
    {
      name: 'internalRef',
      label: 'Odniesienie wewnętrzne (tylko panel)',
      type: 'text',
      ...panelField,
    },
  ],
}
