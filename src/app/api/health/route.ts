import config from '@payload-config'
import { getPayload } from 'payload'

import { log } from '@/lib/logger'
import { REQUEST_ID_HEADER, requestIdFrom } from '@/lib/requestId'

// Never cached: every call checks the app and the database now.
export const dynamic = 'force-dynamic'

const NO_STORE = { 'Cache-Control': 'no-store' }

/**
 * `GET /api/health` — 200 when the app runs and the database answers, 503 otherwise.
 * The first call starts Payload, which in production also runs pending migrations, so a deploy
 * waits for this before it counts as up (Dockerfile HEALTHCHECK, G16). Returns no data on purpose.
 */
export async function GET(request: Request) {
  try {
    const payload = await getPayload({ config })
    await payload.count({ collection: 'users', overrideAccess: true })
    return Response.json({ status: 'ok' }, { headers: NO_STORE })
  } catch (error) {
    log.error(
      { requestId: requestIdFrom(request.headers.get(REQUEST_ID_HEADER)), error },
      'Health check failed',
    )
    return Response.json({ status: 'unavailable' }, { status: 503, headers: NO_STORE })
  }
}
