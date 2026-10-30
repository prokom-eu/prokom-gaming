import { customerSession, readJsonBody } from '@/lib/account/session.server'
import { fieldErrors, savedConfigSchema } from '@/lib/account/schema'
import { errorFields, log } from '@/lib/logger'

const json = (body: unknown, status: number) => Response.json(body, { status })

/** Most saved configurations per account (the collection allows the same). */
const MAX_SAVED = 20

type Row = { id?: string | null; label: string; k: string; light?: string | null; savedAt: string }

/** `POST /api/konto/konfiguracje` — „Zapisz na koncie” in the configurator (spec. §7). */
export async function POST(request: Request) {
  const session = await customerSession(request.headers)
  if (!session) return json({ error: 'unauthorized' }, 401)
  const parsed = savedConfigSchema.safeParse(await readJsonBody(request))
  if (!parsed.success) return json({ error: 'invalid', fields: fieldErrors(parsed.error) }, 400)
  const { payload, customer } = session
  const rows = (customer.savedConfigs ?? []) as Row[]
  if (rows.length >= MAX_SAVED) return json({ error: 'full' }, 409)
  const row: Row = {
    label: parsed.data.label,
    k: parsed.data.k,
    light: parsed.data.light ?? null,
    savedAt: new Date().toISOString(),
  }
  try {
    await payload.update({
      collection: 'customers',
      id: customer.id,
      data: { savedConfigs: [row, ...rows] },
      overrideAccess: true,
      depth: 0,
    })
    return json({ ok: true }, 201)
  } catch (error) {
    log.error({ ...errorFields(error) }, 'saved configuration failed')
    return json({ error: 'unavailable' }, 503)
  }
}

/** `DELETE /api/konto/konfiguracje?id=<row id>` — removes one saved configuration. */
export async function DELETE(request: Request) {
  const session = await customerSession(request.headers)
  if (!session) return json({ error: 'unauthorized' }, 401)
  const id = new URL(request.url).searchParams.get('id')
  const { payload, customer } = session
  const rows = (customer.savedConfigs ?? []) as Row[]
  const kept = rows.filter((r) => r.id !== id)
  if (!id || kept.length === rows.length) return json({ error: 'not_found' }, 404)
  await payload.update({
    collection: 'customers',
    id: customer.id,
    data: { savedConfigs: kept },
    overrideAccess: true,
    depth: 0,
  })
  return json({ ok: true }, 200)
}
