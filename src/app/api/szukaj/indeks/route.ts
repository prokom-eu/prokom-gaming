import { features } from '@/lib/features'
import { errorFields, log } from '@/lib/logger'
import { loadPublicOffer } from '@/lib/offer.server'
import { buildSearchIndex } from '@/lib/search/searchIndex'

/**
 * `GET /api/szukaj/indeks` — the search index (NAWIGACJA §5.1), fetched by the dialog on first
 * open: builds with the published price, games with their smooth builds, pages. Public data
 * only. A short shared cache: a price publication shows within five minutes.
 */
export async function GET() {
  try {
    const { hero, fps } = await loadPublicOffer()
    const index = buildSearchIndex({ hero, games: fps.games, table: fps.table, flags: features() })
    return Response.json(index, {
      headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600' },
    })
  } catch (error) {
    log.error({ ...errorFields(error) }, 'search index failed')
    return Response.json({ builds: [], games: [], pages: [] }, { status: 503 })
  }
}
