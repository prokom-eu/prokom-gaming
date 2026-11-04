import { contentOg, OG_SIZE, OG_TYPE } from '@/lib/og/render'

// Link preview of this page (runda v2 §1.2): the shared content template with the page's title.
export const alt = 'Polityka prywatności i cookies — PRO-KOM Gaming'
export const size = OG_SIZE
export const contentType = OG_TYPE

export default function Image() {
  return contentOg('Polityka prywatności i cookies')
}
