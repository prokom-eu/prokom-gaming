'use server'

import { errorFields, log } from '../../lib/logger'
import { findInquiries } from '../inquiries/search'
import { panelActionSession } from '../session'
import { partHits, type PanelSearchResult } from './match'

/**
 * The search of the panel's top bar (panel spec §2, P8): inquiries (number, name, build), builds,
 * configurator options (cases and coolers among them) and parts of the power levels. Admin only.
 * POST through this action, so the text never goes into an address; logs carry no search text.
 * `null` = no access or the search failed.
 */

const PER_GROUP = 6

export async function searchPanel(query: string): Promise<PanelSearchResult | null> {
  if (typeof query !== 'string') return null
  const session = await panelActionSession('admin')
  if (!session) return null
  const q = query.trim().slice(0, 60)
  if (q.length < 2) return { inquiries: [], builds: [], options: [], parts: [] }
  const { payload } = session
  const trusted = { overrideAccess: true, depth: 0, limit: PER_GROUP } as const
  try {
    const [inquiries, builds, options, levels] = await Promise.all([
      findInquiries(payload, q, PER_GROUP),
      payload.find({
        collection: 'builds',
        where: { or: [{ name: { like: q } }, { slug: { like: q } }] },
        select: { slug: true, name: true },
        ...trusted,
      }),
      payload.find({
        collection: 'options',
        where: {
          or: [{ publicLabel: { like: q } }, { internalModel: { like: q } }, { code: { like: q } }],
        },
        select: { code: true, publicLabel: true, internalModel: true, type: true },
        ...trusted,
      }),
      payload.find({
        collection: 'power-levels',
        where: {
          or: [
            { 'components.internalModel': { like: q } },
            { 'components.publicLabel': { like: q } },
          ],
        },
        select: { code: true, tierRoman: true, components: true },
        ...trusted,
        limit: 20,
      }),
    ])
    return {
      inquiries,
      builds: builds.docs.map((b) => ({ slug: b.slug, name: b.name })),
      options: options.docs.map((o) => ({
        id: o.id,
        label: o.internalModel || o.publicLabel,
        detail: o.code,
      })),
      parts: partHits(levels.docs, q).slice(0, PER_GROUP),
    }
  } catch (error) {
    log.error({ ...errorFields(error) }, 'panel search failed')
    return null
  }
}
