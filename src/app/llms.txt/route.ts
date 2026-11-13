import { connection } from 'next/server'

import { getEnv } from '@/lib/env'
import { loadFaq } from '@/lib/faq.server'
import { loadGameLinks } from '@/lib/games.server'
import { llmsText } from '@/lib/llms'
import { errorFields, log } from '@/lib/logger'
import { loadPublicOffer } from '@/lib/offer.server'
import { isIndexable } from '@/lib/seo'

/**
 * `/llms.txt` — summary of the shop for AI assistants (`lib/llms.ts`). Per request like the
 * sitemap: offer, games and questions come from the database (the image build has none); each
 * part falls back to empty on its own, so the facts about the company always stay.
 */
export async function GET(): Promise<Response> {
  await connection()
  const safe = async <T>(what: string, read: () => Promise<T>, fallback: T): Promise<T> => {
    try {
      return await read()
    } catch (error) {
      log.error({ ...errorFields(error), what }, 'llms.txt data failed')
      return fallback
    }
  }
  const [offer, games, faq] = await Promise.all([
    safe('offer', async () => (await loadPublicOffer()).hero, null),
    safe('games', loadGameLinks, []),
    safe('faq', async () => (await loadFaq()).flatMap((s) => s.questions), []),
  ])
  const text = llmsText({
    siteUrl: getEnv().SITE_URL,
    builds: offer?.builds ?? [],
    pricedAt: offer?.pricedAt ?? null,
    games,
    faq,
  })
  return new Response(text, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      // Staging and local runs stay out of indexes, like every page there.
      ...(isIndexable(getEnv().SITE_ENV) ? {} : { 'X-Robots-Tag': 'noindex' }),
    },
  })
}
