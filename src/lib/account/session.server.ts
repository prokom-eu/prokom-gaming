import 'server-only'

import config from '@payload-config'
import { headers as nextHeaders } from 'next/headers'
import { getPayload, type Payload } from 'payload'

import { verifiedCustomerEmail } from '@/access/customer'
import type { Customer } from '@/payload-types'

export type CustomerSession = { payload: Payload; customer: Customer; email: string }

/**
 * The signed-in, verified customer of this request, or `null` (anonymous, panel staff, or an
 * unverified account). Read from Payload's own login cookie (`payload-token`).
 */
export async function customerSession(requestHeaders?: Headers): Promise<CustomerSession | null> {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: requestHeaders ?? (await nextHeaders()) })
  const email = verifiedCustomerEmail({ user })
  if (!user || !email || user.collection !== 'customers') return null
  return { payload, customer: user as Customer, email }
}

/** Reads a small JSON body; `null` when it is not JSON, too big or broken. */
export async function readJsonBody(request: Request, maxBytes = 8 * 1024): Promise<unknown> {
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
    return null
  }
  if (Number(request.headers.get('content-length') ?? 0) > maxBytes) return null
  const raw = await request.text()
  if (new TextEncoder().encode(raw).length > maxBytes) return null
  try {
    return JSON.parse(raw) as unknown
  } catch {
    return null
  }
}
