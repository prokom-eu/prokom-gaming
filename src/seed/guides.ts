/**
 * Guides from seed/prokomgaming/guides.json (spec. §20). Pure, no database: the runner
 * (`index.ts`) converts the Markdown of the ready guide to Lexical and upserts by `slug`.
 * Only `status: "ready"` is published; the rest are drafts and never reach the site.
 */
import { readFileSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

import guidesSeed from '../../seed/prokomgaming/guides.json'
import { GUIDE_CATEGORIES, type GuideCategory } from '../lib/guides'
import { menuCreatures } from '../lib/site'
import type { Guide } from '../payload-types'

const SEED_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../seed/prokomgaming',
)

/** Text of the ready guides (board Poradnik, 1:1); drafts have none yet. */
const CONTENT_FILES: Record<string, string> = { rodzice: 'guide-rodzice.md' }

/** „Od czego zaczynają nasi klienci” of the board Poradnik. */
const RECOMMENDED: Record<string, { creature: string; note: string }[]> = {
  rodzice: [
    { creature: 'skrzat', note: 'Roblox, Minecraft, Fortnite, CS2' },
    { creature: 'licho', note: 'e-sport i nowe gry na wysokich' },
    { creature: 'strzyga', note: 'FullHD na ultra, 2K na wysokich' },
  ],
}

export type GuideSeed = {
  published: boolean
  /** Markdown of the content; `null` for a draft without text. */
  markdown: string | null
  data: {
    title: string
    slug: string
    category: GuideCategory
    lead: string
    readingTime: number
    creature: Guide['creature']
    author: string
    recommended: { creature: Guide['creature']; note: string }[]
  }
}

const isCreature = (slug: string): slug is Guide['creature'] =>
  menuCreatures.some((c) => c.slug === slug)

function creatureOf(slug: string): Guide['creature'] {
  if (!isCreature(slug)) throw new Error(`Seed: unknown creature „${slug}”.`)
  return slug
}

type SeedItem = (typeof guidesSeed)['items'][number]

const categoryValue = new Map<string, GuideCategory>(
  GUIDE_CATEGORIES.map((c) => [c.label, c.value]),
)

export function mapGuide(item: SeedItem): GuideSeed {
  const category = categoryValue.get(item.category)
  if (!category) throw new Error(`Seed: unknown guide topic „${item.category}”.`)
  const minutes = Number.parseInt(item.readingTime, 10)
  if (!Number.isFinite(minutes)) throw new Error(`Seed: reading time „${item.readingTime}”.`)
  const file = CONTENT_FILES[item.slug]
  const published = item.status === 'ready'
  if (published && !file) throw new Error(`Seed: ready guide „${item.slug}” has no text.`)
  return {
    published,
    markdown: file ? readFileSync(path.join(SEED_DIR, file), 'utf8') : null,
    data: {
      title: item.title,
      slug: item.slug,
      category,
      lead: item.lead,
      readingTime: minutes,
      creature: creatureOf(item.creature),
      author: item.author,
      recommended: (RECOMMENDED[item.slug] ?? []).map((r) => ({
        creature: creatureOf(r.creature),
        note: r.note,
      })),
    },
  }
}

export const guideSeeds = (): GuideSeed[] => guidesSeed.items.map(mapGuide)
