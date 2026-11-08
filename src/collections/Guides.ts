import type { Access, CollectionConfig } from 'payload'

import { adminOnly, isPanelUser } from '../access/panel'
import { GUIDE_CATEGORIES } from '../lib/guides'
import { menuCreatures } from '../lib/site'
import { GROUP_CONTENT } from './shared'

/** Creature of a guide = slug of its build (scene, sigil, link to the build page). */
const CREATURE_OPTIONS = menuCreatures.map((c) => ({ label: c.name, value: c.slug }))

/** The site reads published guides only; drafts exist in the panel alone. */
const publishedOrPanel: Access = ({ req }) =>
  isPanelUser(req) ? true : { _status: { equals: 'published' } }

/**
 * Guides (spec. §20, boards Poradniki / Poradnik). Drafts are on: the six titles waiting for
 * their text are drafts and never reach the site. Each `##` heading of the content is one entry
 * of „W tym poradniku”; a quote is the „Ściągawka” box.
 */
export const Guides: CollectionConfig = {
  slug: 'guides',
  labels: { singular: 'Poradnik', plural: 'Poradniki' },
  admin: {
    group: GROUP_CONTENT,
    useAsTitle: 'title',
    defaultColumns: ['title', 'category', '_status', 'publishedAt'],
  },
  defaultSort: '-publishedAt',
  versions: { drafts: true },
  // `readVersions` explicitly: without it Payload lets any signed-in user read the versions —
  // customers (G14) would read the drafts through `/api/guides/versions`.
  access: {
    read: publishedOrPanel,
    readVersions: adminOnly,
    create: adminOnly,
    update: adminOnly,
    delete: adminOnly,
  },
  fields: [
    { name: 'title', label: 'Tytuł', type: 'text', required: true },
    {
      type: 'row',
      fields: [
        {
          name: 'slug',
          label: 'Adres (slug)',
          type: 'text',
          required: true,
          unique: true,
          index: true,
          validate: (value: unknown) =>
            typeof value === 'string' && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(value)
              ? true
              : 'Małe litery, cyfry i myślniki, np. jak-wybrac-monitor.',
        },
        {
          name: 'category',
          label: 'Temat',
          type: 'select',
          required: true,
          options: GUIDE_CATEGORIES.map(({ label, value }) => ({ label, value })),
        },
      ],
    },
    { name: 'lead', label: 'Zajawka', type: 'textarea', required: true },
    {
      name: 'content',
      label: 'Treść',
      type: 'richText',
      required: true,
      admin: {
        description:
          'Pierwszy akapit = wstęp (większa czcionka). Nagłówek H2 = pozycja „W tym poradniku”. Cytat = ramka „Ściągawka”.',
      },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'readingTime',
          label: 'Czas czytania (min)',
          type: 'number',
          required: true,
          min: 1,
          max: 60,
        },
        {
          name: 'creature',
          label: 'Istota (scena i pieczęć)',
          type: 'select',
          required: true,
          options: CREATURE_OPTIONS,
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'author',
          label: 'Autor',
          type: 'text',
          required: true,
          defaultValue: 'Zespół PRO-KOM Gaming',
        },
        {
          name: 'publishedAt',
          label: 'Data publikacji',
          type: 'date',
          admin: {
            date: { pickerAppearance: 'dayOnly', displayFormat: 'dd.MM.yyyy' },
            description: 'Ustaw przy publikacji. Puste = data się nie pokazuje.',
          },
        },
      ],
    },
    {
      name: 'recommended',
      label: 'Od czego zaczynają nasi klienci (polecane istoty)',
      type: 'array',
      maxRows: 3,
      labels: { singular: 'Istota', plural: 'Istoty' },
      admin: { description: 'Puste = ramka się nie pokazuje.' },
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'creature',
              label: 'Istota',
              type: 'select',
              required: true,
              options: CREATURE_OPTIONS,
            },
            { name: 'note', label: 'Do czego', type: 'text', required: true },
          ],
        },
      ],
    },
  ],
}
