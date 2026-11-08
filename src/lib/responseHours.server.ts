import 'server-only'

import config from '@payload-config'
import { getPayload } from 'payload'

import { errorFields, log } from './logger'
import { RESPONSE_HOURS, responseHours } from './responseHours'

/** Hours for the header from the panel settings; the constant when the database is unreachable. */
export async function loadResponseHours(): Promise<string> {
  try {
    const payload = await getPayload({ config })
    const settings = await payload.findGlobal({
      slug: 'site-settings',
      select: { responseTime: true },
      depth: 0,
      overrideAccess: true,
    })
    return responseHours(settings.responseTime)
  } catch (error: unknown) {
    log.warn(errorFields(error), 'response hours: site-settings unreadable')
    return RESPONSE_HOURS
  }
}
