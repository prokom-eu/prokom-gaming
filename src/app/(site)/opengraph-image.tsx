import { homeOg, OG_SIZE, OG_TYPE } from '@/lib/og/render'

// Link preview of the home page (runda v2 §1.2). Pages below without their own `opengraph-image`
// get no picture from here when they set `openGraph` themselves — each indexed page has its own.
export const alt = 'PRO-KOM Gaming — komputery do gier. Sprawdzone w grach.'
export const size = OG_SIZE
export const contentType = OG_TYPE

export default function Image() {
  return homeOg()
}
