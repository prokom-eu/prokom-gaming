import { customerSession, readJsonBody } from '@/lib/account/session.server'
import { fieldErrors, profileSchema } from '@/lib/account/schema'
import { errorFields, log } from '@/lib/logger'

const json = (body: unknown, status: number) => Response.json(body, { status })

/**
 * `PATCH /api/konto/dane` — name and phone from „Dane i zgody”. The e-mail does not change here:
 * it is the key to the customer's orders (a change would need a new verification).
 */
export async function PATCH(request: Request) {
  const session = await customerSession(request.headers)
  if (!session) return json({ error: 'unauthorized' }, 401)
  const parsed = profileSchema.safeParse(await readJsonBody(request))
  if (!parsed.success) return json({ error: 'invalid', fields: fieldErrors(parsed.error) }, 400)
  try {
    await session.payload.update({
      collection: 'customers',
      id: session.customer.id,
      data: { name: parsed.data.name, phone: parsed.data.phone || null },
      overrideAccess: true,
      depth: 0,
    })
    return json({ ok: true }, 200)
  } catch (error) {
    log.error({ ...errorFields(error) }, 'profile update failed')
    return json({ error: 'unavailable' }, 503)
  }
}
