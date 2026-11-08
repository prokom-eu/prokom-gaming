import 'server-only'

import config from '@payload-config'
import { getPayload } from 'payload'

import { errorFields, log } from '@/lib/logger'
import { hasLegalContent } from '@/lib/legal'
import type { LegalTerm } from '@/payload-types'

/** A legal global read as the public visitor; `null` when the database does not answer. */
export async function loadLegal(slug: 'legal-terms' | 'legal-privacy'): Promise<LegalTerm | null> {
  try {
    const payload = await getPayload({ config })
    const doc = await payload.findGlobal({ slug, depth: 0, overrideAccess: false })
    return hasLegalContent(doc) ? (doc as LegalTerm) : null
  } catch (error) {
    log.error({ ...errorFields(error), slug }, 'legal page data failed')
    return null
  }
}
