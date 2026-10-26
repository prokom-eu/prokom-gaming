import { describe, expect, it, vi } from 'vitest'

type FindArgs = {
  collection: string
  select?: Record<string, boolean>
  overrideAccess?: boolean
  where?: unknown
}

const docs: Record<string, object[]> = {
  builds: [
    { id: 1, slug: 'wampir' },
    { id: 2, slug: 'skrzat' },
  ],
  games: [
    {
      id: 10,
      slug: 'elden-ring',
      name: 'Elden Ring',
      kind: 'capped',
      fpsCap: 60,
      settingNote: null,
      popularRank: 28,
    },
  ],
  'fps-results': [
    { build: 1, game: 10, resolution: 'qhd', fps: 60, kind: 'm', sourceLabel: 'TPU', setting: 's' },
    {
      build: 1,
      game: 10,
      resolution: 'qhd',
      fps: 58,
      kind: 'p',
      sourceLabel: 'PRO-KOM',
      setting: 's',
      measuredAt: '2026-11-25T10:00:00.000Z',
    },
    { build: 2, game: 99, resolution: 'qhd', fps: 1, kind: 'e', sourceLabel: 'x', setting: 's' },
  ],
}
const find = vi.fn(async (args: FindArgs) => ({
  // A slug filter that matches nothing returns no builds, as the database would.
  docs:
    args.collection === 'builds' && JSON.stringify(args.where ?? {}).includes('nieznany')
      ? []
      : docs[args.collection],
}))

vi.mock('@payload-config', () => ({ default: {} }))
vi.mock('payload', () => ({ getPayload: async () => ({ find }) }))

const { loadFpsTable } = await import('./fps.server')

describe('loadFpsTable', () => {
  it('reads every collection as the public visitor, never asking for cpu or gpu', async () => {
    await loadFpsTable()
    expect(find).toHaveBeenCalledTimes(3)
    for (const [args] of find.mock.calls) {
      expect(args.overrideAccess, args.collection).toBe(false)
      expect(args.select, args.collection).toBeDefined()
      expect(Object.keys(args.select ?? {})).not.toContain('cpu')
      expect(Object.keys(args.select ?? {})).not.toContain('gpu')
    }
  })

  it('returns slugs, picks by priority and skips results of unknown games', async () => {
    const { table, games } = await loadFpsTable({ builds: ['wampir', 'skrzat'] })
    expect(Object.keys(table)).toEqual(['wampir|elden-ring|qhd'])
    expect(table['wampir|elden-ring|qhd']).toMatchObject({ fps: 58, kind: 'p', sourceUrl: null })
    expect(games).toEqual([
      {
        slug: 'elden-ring',
        name: 'Elden Ring',
        kind: 'capped',
        fpsCap: 60,
        settingNote: null,
        popularRank: 28,
      },
    ])
  })

  it('unknown builds → empty table, no query on results', async () => {
    find.mockClear()
    const { table, games } = await loadFpsTable({ builds: ['nieznany'] })
    expect(table).toEqual({})
    expect(games).toHaveLength(1)
    expect(find.mock.calls.map(([args]) => args.collection)).not.toContain('fps-results')
  })
})
