import { connection } from 'next/server'

import { errorFields, log } from '@/lib/logger'
import { buildOgData } from '@/lib/og/data'
import { buildOg, contentOg, OG_SIZE, OG_TYPE } from '@/lib/og/render'

// Link preview of a build (runda v2 §1.2): scene, name, power and the price „od” from the
// published snapshot — the same price as the page title.
export const alt = 'Zestaw PRO-KOM Gaming — komputer do gier'
export const size = OG_SIZE
export const contentType = OG_TYPE

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  // Per request, like the page: prices change with a publication in the panel.
  await connection()
  const { slug } = await params
  try {
    const data = await buildOgData(slug)
    if (data) return await buildOg(data)
  } catch (error: unknown) {
    // A crawler still gets a picture; the page itself shows the problem.
    log.error({ slug, ...errorFields(error) }, 'og image failed')
  }
  return contentOg('Wszystkie zestawy')
}
