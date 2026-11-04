import { connection } from 'next/server'

import { errorFields, log } from '@/lib/logger'
import { guideOgTitle } from '@/lib/og/data'
import { contentOg, OG_SIZE, OG_TYPE } from '@/lib/og/render'

// Link preview of a guide (runda v2 §1.2): the content template with the guide's title.
export const alt = 'Poradnik — PRO-KOM Gaming'
export const size = OG_SIZE
export const contentType = OG_TYPE

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  // Per request, like the page: guides are published in the panel.
  await connection()
  const { slug } = await params
  try {
    const data = await guideOgTitle(slug)
    if (data) return await contentOg(data)
  } catch (error: unknown) {
    // A crawler still gets a picture; the page itself shows the problem.
    log.error({ slug, ...errorFields(error) }, 'og image failed')
  }
  return contentOg('Poradniki')
}
