import 'server-only'

import config from '@payload-config'
import { getPayload } from 'payload'

import type { CompareBuild, CompareData, CompareGame } from './compare'
import { fpsFor, RESOLUTIONS } from './fps'
import { TIER_HINTS } from './home'
import { loadOffer } from './offer.server'

const idOf = (value: unknown): number | null =>
  typeof value === 'number'
    ? value
    : value && typeof value === 'object' && 'id' in value && typeof value.id === 'number'
      ? value.id
      : null

/**
 * Data of `/porownaj`: the 16 builds with what the parts table shows, the games and every number.
 * The offer comes from `loadOffer()` (prices from the published snapshot). On top of it: creature
 * texts and the cooler as the visitor, and the power supply's public label — `components` is
 * panel-only as a whole, so it is read trusted and only `role` + `publicLabel` of the PSU are
 * copied out (ADR-G002 §8.7, same pattern as `loadOffer()`). Builds without a price are left out:
 * a comparison is about money too. `null` without an offer.
 */
export async function loadCompare(): Promise<CompareData | null> {
  const payload = await getPayload({ config })
  const [{ hero, fps }, builds, parts, options] = await Promise.all([
    loadOffer(payload),
    payload.find({
      collection: 'builds',
      select: {
        slug: true,
        level: true,
        cooler: true,
        creature: { genitive: true, giftTitle: true, gift: true },
      },
      overrideAccess: false,
      depth: 0,
      pagination: false,
    }),
    payload.find({
      collection: 'power-levels',
      select: { components: { role: true, publicLabel: true } },
      overrideAccess: true,
      depth: 0,
      pagination: false,
    }),
    payload.find({
      collection: 'options',
      select: { publicLabel: true },
      overrideAccess: false,
      depth: 0,
      pagination: false,
    }),
  ])

  const psuOf = new Map(
    parts.docs.map((l) => [l.id, l.components?.find((c) => c.role === 'psu')?.publicLabel ?? null]),
  )
  const optionLabel = new Map(options.docs.map((o) => [o.id, o.publicLabel]))
  const extra = new Map(
    builds.docs.map((b) => {
      const level = idOf(b.level)
      const cooler = idOf(b.cooler)
      return [
        b.slug,
        {
          genitive: b.creature.genitive,
          giftTitle: b.creature.giftTitle,
          gift: b.creature.gift,
          psu: level === null ? null : (psuOf.get(level) ?? null),
          cooler: cooler === null ? null : (optionLabel.get(cooler) ?? null),
        },
      ]
    }),
  )

  const priced = hero.builds
    .filter((b) => b.price !== null && extra.has(b.slug))
    .sort((a, b) => a.price! - b.price!)
  if (priced.length < 2) return null

  const list: CompareBuild[] = priced.map((b, rank) => {
    const e = extra.get(b.slug)!
    return {
      slug: b.slug,
      name: b.name,
      key: b.key,
      accusative: b.accusative,
      genitive: e.genitive,
      epithet: b.epithet,
      giftTitle: e.giftTitle,
      gift: e.gift,
      tierRoman: b.tierRoman,
      tierLabel: b.tierLabel,
      price: b.price!,
      rank,
      photo: b.photo,
      cpu: b.cpu,
      gpu: b.gpu,
      ram: b.ram,
      disk: b.disk,
      psu: e.psu,
      cooler: e.cooler,
      look: b.look,
      monitor: TIER_HINTS[b.tier] ?? b.tierLabel,
    }
  })
  const games: CompareGame[] = fps.games.map((g) => ({
    slug: g.slug,
    name: g.name,
    kind: g.kind,
    fpsCap: g.fpsCap,
  }))

  const out = {
    fps: { fullhd: [], qhd: [], uhd: [] },
    kinds: { fullhd: [], qhd: [], uhd: [] },
  } as Pick<CompareData, 'fps' | 'kinds'>
  for (const resolution of RESOLUTIONS) {
    for (const game of games) {
      const rows = list.map((b) => fpsFor(fps.table, b.slug, game.slug, resolution))
      out.fps[resolution].push(rows.map((r) => r?.fps ?? null))
      out.kinds[resolution].push(rows.map((r) => r?.kind ?? '-').join(''))
    }
  }
  return { builds: list, games, ...out }
}
