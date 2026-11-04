import 'server-only'

import config from '@payload-config'
import { getPayload } from 'payload'

import { RESOLUTION_LABELS, RESOLUTIONS } from '../fps'
import { PICKER_DEFAULT_RESOLUTION } from '../games'
import { loadGamePage } from '../games.server'
import { loadGuide } from '../guides.server'
import { loadOffer } from '../offer.server'

import type { BuildOg, GameOgPick } from './render'

/**
 * What the link previews of the build and game pages show, read like the pages read it: as the
 * public visitor, prices from the published snapshot, FPS from `fps-results` (never computed).
 * `null` = no such build / game (the route then draws the content template).
 */

export async function buildOgData(slug: string): Promise<BuildOg | null> {
  const { hero } = await loadOffer(await getPayload({ config }))
  const build = hero.builds.find((b) => b.slug === slug)
  if (!build) return null
  return {
    slug: build.slug,
    name: build.name,
    sceneKey: build.key,
    epithet: build.epithet,
    power: `Komputer do gier ${RESOLUTION_LABELS[build.resolution]}`,
    price: build.price,
  }
}

export type GameOg = { game: string; resolution: string; picks: GameOgPick[] }

/** The picks the page opens with: 2K (board KomputerDo), else the first resolution with any. */
export async function gameOgData(slug: string): Promise<GameOg | null> {
  const data = await loadGamePage(slug)
  if (!data) return null
  const order = [
    PICKER_DEFAULT_RESOLUTION,
    ...RESOLUTIONS.filter((r) => r !== PICKER_DEFAULT_RESOLUTION),
  ]
  const resolution =
    order.find((r) => (data.picks[r][0] ?? []).length > 0) ?? PICKER_DEFAULT_RESOLUTION
  const picks = (data.picks[resolution][0] ?? []).map((p) => ({
    slug: p.slug,
    name: data.cards[p.slug]?.name ?? p.slug,
    fps: p.fps,
    kind: p.kind,
  }))
  return { game: data.game.name, resolution: RESOLUTION_LABELS[resolution], picks }
}

/** Title of a published guide (drafts are not found, like on the page). */
export async function guideOgTitle(slug: string): Promise<string | null> {
  return (await loadGuide(slug))?.title ?? null
}
