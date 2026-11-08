import 'server-only'

import config from '@payload-config'
import { getPayload } from 'payload'

import { FAQ_PAGE_GROUPS, faqSections, type FaqPageGroup, type FaqSection } from '@/lib/faq'

/** Questions of the given page groups (default: all of `/pytania`), sorted by `order`. */
export async function loadFaq(
  groups: readonly FaqPageGroup[] = FAQ_PAGE_GROUPS,
): Promise<FaqSection[]> {
  const payload = await getPayload({ config })
  const { docs } = await payload.find({
    collection: 'faq',
    where: { group: { in: [...groups] } },
    select: { question: true, answer: true, group: true },
    sort: 'order',
    pagination: false,
    overrideAccess: false,
    depth: 0,
  })
  return faqSections(docs).filter((s) => groups.includes(s.group))
}
