import 'server-only'

import config from '@payload-config'
import { getPayload } from 'payload'

import { compareTeaser, gamesPanel, metricSample, type HomeData, type PanelGame } from './home'
import { loadOffer } from './offer.server'

/**
 * Data of the home page: the hero and the sections that need the database (16 creatures, games
 * panel, sample certificate, comparison, questions). The offer is shared with `/zestawy`
 * (`loadOffer()`); the questions are read as the public visitor.
 */
export async function loadHome(): Promise<HomeData> {
  const payload = await getPayload({ config })
  const [{ hero, fps }, faq] = await Promise.all([
    loadOffer(payload),
    payload.find({
      collection: 'faq',
      where: { group: { equals: 'home' } },
      select: { question: true, answer: true },
      sort: 'order',
      // Six on the board (spec. §4 pt 12): more added in the panel would not break the layout.
      limit: 6,
      overrideAccess: false,
      depth: 0,
    }),
  ])

  const games: PanelGame[] = fps.games.map((g) => ({
    slug: g.slug,
    name: g.name,
    kind: g.kind,
    fpsCap: g.fpsCap,
  }))
  return {
    hero,
    panel: games.length > 0 && hero.tiers.length > 0 ? gamesPanel(hero, games, fps.table) : null,
    metric: metricSample(hero, games, fps.table),
    compare: compareTeaser(hero, games, fps.table),
    faq: faq.docs.map((q) => ({ id: q.id, question: q.question, answer: q.answer })),
  }
}
