import { APIError, ValidationError } from 'payload'
import type {
  CollectionBeforeChangeHook,
  CollectionBeforeDeleteHook,
  CollectionConfig,
  Where,
} from 'payload'
import { date, text } from 'payload/shared'

import { anyone, adminField, adminOnly } from '../access/panel'
import { FPS_KINDS, GROUP_GAMES, RESOLUTIONS, requiredWhen } from './shared'

const TEST_KINDS = ['m', 'r', 'e'] as const

/**
 * A web address for the site's "Jak liczymy?" link: only `http(s)`, so a typo or `javascript:` typed
 * in the panel never becomes a link on the public page. Empty values go to Payload's own check.
 */
export const webUrl: typeof text = (value, options) => {
  if (typeof value === 'string' && value !== '') {
    let protocol = ''
    try {
      protocol = new URL(value).protocol
    } catch {
      // not an address at all
    }
    if (protocol !== 'https:' && protocol !== 'http:') {
      return 'Podaj pełny adres testu, zaczynający się od https://.'
    }
  }
  return text(value, options)
}

const idOf = (value: unknown): unknown =>
  value !== null && typeof value === 'object' && 'id' in value ? value.id : value

/**
 * One test number (`m`/`r`/`e`) per build × game × resolution: the seed replaces it when the data
 * changes, and two of them would make the number on the site depend on query order. Measurements
 * (`p`) may repeat — the newest one wins (ADR-G004 §5).
 * Checked in the app (count, then insert), not by a database constraint: two saves at the same
 * moment could both pass. Acceptable with one panel user and a seed inside a transaction; a partial
 * unique index (`WHERE kind <> 'p'`) would need a hand-written migration.
 */
export const oneTestResultPerSlot: CollectionBeforeChangeHook = async ({
  data,
  originalDoc,
  req,
}) => {
  const doc = { ...originalDoc, ...data }
  if (!TEST_KINDS.includes(doc.kind)) return data
  const where: Where = {
    and: [
      { build: { equals: idOf(doc.build) } },
      { game: { equals: idOf(doc.game) } },
      { resolution: { equals: doc.resolution } },
      { kind: { in: [...TEST_KINDS] } },
      ...(originalDoc?.id ? [{ id: { not_equals: originalDoc.id } }] : []),
    ],
  }
  const found = await req.payload.count({
    collection: 'fps-results',
    where,
    overrideAccess: true,
    req,
  })
  if (found.totalDocs > 0) {
    throw new ValidationError(
      {
        collection: 'fps-results',
        errors: [
          {
            path: 'kind',
            message:
              'Ten zestaw ma już wynik z testu albo szacunek w tej grze i rozdzielczości. Popraw tamten wpis zamiast dodawać drugi.',
          },
        ],
      },
      req.t,
    )
  }
  return data
}

/**
 * A game or build with FPS results cannot be deleted: `build_id`/`game_id` are `NOT NULL` with
 * `ON DELETE set null`, so Postgres would answer with a 500. Deleting the results silently would
 * also drop PRO-KOM measurements, which cannot be repeated.
 */
export function blockDeleteWithFpsResults(field: 'build' | 'game'): CollectionBeforeDeleteHook {
  return async ({ id, req }) => {
    const found = await req.payload.count({
      collection: 'fps-results',
      where: { [field]: { equals: id } },
      overrideAccess: true,
      req,
    })
    if (found.totalDocs === 0) return
    // `data` and `name` set for the same reason as in `usage.ts`: production builds drop the message.
    const error = new APIError(
      `Nie można usunąć — ma ${found.totalDocs} wyników FPS (Gry i klatki → Wyniki FPS). Usuń je najpierw.`,
      400,
      { fpsResults: found.totalDocs },
      true,
    )
    error.name = 'APIError'
    throw error
  }
}

/**
 * FPS of a build in a game at a resolution (ADR-G004 §5), imported from
 * `seed/prokomgaming/fps-sources.json`. The site only reads these numbers, always with the source
 * label (`lib/fps.ts`). `cpu`/`gpu` name the level's parts — panel only, like internal models
 * (ADR-G002 §8.7).
 * `unit` links a `p` record to the measured unit — only a unit built exactly to the build's recipe
 * (ADR-G004 §5); measurements of a changed unit stay on its certificate only.
 */
export const FpsResults: CollectionConfig = {
  slug: 'fps-results',
  labels: { singular: 'Wynik FPS', plural: 'Wyniki FPS' },
  admin: {
    group: GROUP_GAMES,
    defaultColumns: ['build', 'game', 'resolution', 'fps', 'kind'],
    description:
      'Liczby z testów (ADR-G004). Nowa karta albo procesor w ofercie = nowy seed z czatu. Ręcznie dodajemy tylko pomiary PRO-KOM.',
  },
  access: { read: anyone, create: adminOnly, update: adminOnly, delete: adminOnly },
  indexes: [{ fields: ['build', 'game', 'resolution'] }],
  hooks: { beforeChange: [oneTestResultPerSlot] },
  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'build',
          label: 'Zestaw',
          type: 'relationship',
          relationTo: 'builds',
          required: true,
        },
        { name: 'game', label: 'Gra', type: 'relationship', relationTo: 'games', required: true },
        {
          name: 'resolution',
          label: 'Rozdzielczość',
          type: 'select',
          required: true,
          options: RESOLUTIONS,
        },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'fps', label: 'Klatki (FPS)', type: 'number', required: true, min: 0 },
        { name: 'kind', label: 'Rodzaj', type: 'select', required: true, options: FPS_KINDS },
      ],
    },
    { name: 'sourceLabel', label: 'Źródło', type: 'text', required: true },
    {
      name: 'sourceUrl',
      label: 'Link do testu',
      type: 'text',
      validate: requiredWhen(
        (s) => s.kind === 'm' || s.kind === 'r',
        webUrl,
        'Test i przeliczenie muszą mieć link do testu.',
      ),
    },
    { name: 'setting', label: 'Ustawienia', type: 'text', required: true },
    {
      name: 'measuredAt',
      label: 'Data pomiaru',
      type: 'date',
      admin: { description: 'Dla pomiarów PRO-KOM — najnowszy wygrywa.' },
      validate: requiredWhen((s) => s.kind === 'p', date, 'Pomiar PRO-KOM musi mieć datę.'),
    },
    {
      name: 'unit',
      label: 'Egzemplarz (pomiar PRO-KOM)',
      type: 'relationship',
      relationTo: 'units',
      // Which unit is internal: the public offer API shows the number, not where it came from.
      ...adminField,
      admin: {
        condition: (_, s) => s?.kind === 'p',
        description: 'Tylko egzemplarz złożony dokładnie według przepisu zestawu (ADR-G004 §5).',
      },
    },
    {
      type: 'row',
      fields: [
        { name: 'cpu', label: 'Procesor (tylko panel)', type: 'text', ...adminField },
        { name: 'gpu', label: 'Karta (tylko panel)', type: 'text', ...adminField },
      ],
    },
  ],
}
