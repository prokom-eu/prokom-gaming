import { errorFields, log } from '@/lib/logger'
import { loadWorkshop } from '@/lib/workshop.server'

/**
 * `GET /api/warsztat` — the public workshop strip (ADR-G005): build name, colour and stage of
 * current orders, never who ordered. A short shared cache: stages change a few times a day.
 */
export async function GET() {
  try {
    const { items, inWorkshop } = await loadWorkshop()
    return Response.json(
      {
        inWorkshop,
        items: items.map(({ name, slug, key, stage, text }) => ({ name, slug, key, stage, text })),
      },
      { headers: { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=300' } },
    )
  } catch (error) {
    log.error({ ...errorFields(error) }, 'workshop strip failed')
    return Response.json({ inWorkshop: 0, items: [] }, { status: 503 })
  }
}
