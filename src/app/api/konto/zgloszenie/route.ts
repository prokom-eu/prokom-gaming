import { customerSession, readJsonBody } from '@/lib/account/session.server'
import { fieldErrors, ticketSchema } from '@/lib/account/schema'
import { errorFields, log } from '@/lib/logger'

const json = (body: unknown, status: number) => Response.json(body, { status })

/**
 * `POST /api/konto/zgloszenie` — a problem report from the account (board Konto, ADR-G005). The
 * unit must be the customer's own (same e-mail); the e-mail and the account come from the session,
 * never from the form.
 */
export async function POST(request: Request) {
  const session = await customerSession(request.headers)
  if (!session) return json({ error: 'unauthorized' }, 401)
  const body = await readJsonBody(request)
  const parsed = ticketSchema.safeParse(body)
  if (!parsed.success) return json({ error: 'invalid', fields: fieldErrors(parsed.error) }, 400)
  const input = parsed.data
  const { payload, customer, email } = session

  // Read as the customer: the access rule decides whether this unit is theirs.
  const unit = await payload.find({
    collection: 'units',
    where: { id: { equals: input.unit } },
    select: { code: true },
    limit: 1,
    depth: 0,
    user: customer,
    overrideAccess: false,
  })
  if (unit.docs.length === 0) return json({ error: 'invalid', fields: ['unit'] }, 400)

  try {
    const ticket = await payload.create({
      collection: 'tickets',
      data: {
        unit: input.unit,
        category: input.category as 'stutter' | 'no_power' | 'noise_heat' | 'other',
        description: input.description,
        remoteHelpConsent: input.remoteHelpConsent,
        status: 'new',
        email,
        customer: customer.id,
      },
      overrideAccess: true,
      depth: 0,
    })
    return json({ ok: true, id: ticket.id }, 201)
  } catch (error) {
    log.error({ ...errorFields(error) }, 'ticket save failed')
    return json({ error: 'unavailable' }, 503)
  }
}
