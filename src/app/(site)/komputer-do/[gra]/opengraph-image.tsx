import { connection } from 'next/server'

import { errorFields, log } from '@/lib/logger'
import { gameOgData } from '@/lib/og/data'
import { gameOg, contentOg, OG_SIZE, OG_TYPE } from '@/lib/og/render'

// Link preview of a game page (runda v2 §1.2): „Komputer do {gry}” and the recommended builds
// with their stored FPS and source label (ADR-G004 — the site never computes frame rates).
export const alt = 'Komputer do gry — PRO-KOM Gaming'
export const size = OG_SIZE
export const contentType = OG_TYPE

export default async function Image({ params }: { params: Promise<{ gra: string }> }) {
  // Per request, like the page: prices and FPS change with the panel.
  await connection()
  const { gra } = await params
  try {
    const data = await gameOgData(gra)
    if (data) return await gameOg(data.game, data.resolution, data.picks)
  } catch (error: unknown) {
    // A crawler still gets a picture; the page itself shows the problem.
    log.error({ gra, ...errorFields(error) }, 'og image failed')
  }
  return contentOg('Dobór pod grę')
}
