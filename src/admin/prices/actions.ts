'use server'

import config from '@payload-config'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { getPayload } from 'payload'
import { z } from 'zod'

import { isPanelUser } from '../../access/panel'
import { errorFields, log } from '../../lib/logger'
import { CatalogError } from '../../lib/pricing/catalog'
import { planPublication, problemMessage } from '../../lib/pricing/publish'
import { loadBatch, loadOffer, StalePublicationError, writeBatch } from '../../lib/pricing/store'
import type { User } from '../../payload-types'

export type PublishResult =
  { ok: true; batch: number; changed: number } | { ok: false; messages: string[] }

const input = z.object({
  // `level:P01`, `option:R16`, `service:SERVICE`: only keys, never prices. The code part is not
  // restricted further — codes are free text in the panel; unknown keys end as a stale queue.
  keys: z
    .array(
      z
        .string()
        .max(120)
        .regex(/^(level|option|service):.+$/),
    )
    .max(500),
})

/**
 * "Sprawdź marżę i opublikuj" on the prices screen (ADR-G002 §4). Everything is computed again on
 * the server from the database; the guard blocks a publication under the minimum margin.
 */
export async function publishPrices(raw: unknown): Promise<PublishResult> {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })
  if (!user || !isPanelUser({ user })) {
    return { ok: false, messages: ['Brak uprawnień — zaloguj się do panelu.'] }
  }
  const parsed = input.safeParse(raw)
  if (!parsed.success) return { ok: false, messages: ['Nieprawidłowe dane z formularza.'] }

  try {
    const [offer, current] = await Promise.all([loadOffer(payload), loadBatch(payload)])
    if (!current) return { ok: false, messages: ['Brak opublikowanych cen — uruchom seed.'] }

    const plan = planPublication(offer.catalog, current.snapshot, parsed.data.keys)
    if (!plan.ok) {
      const { minMargin } = offer.catalog.settings
      return { ok: false, messages: plan.problems.map((p) => problemMessage(p, minMargin)) }
    }

    const { batch } = await writeBatch(payload, plan, user as User, current.snapshot.batch)
    log.info(
      { batch, rows: plan.rows.length, changed: plan.changes.length, userId: user.id },
      'prices published',
    )
    revalidatePath('/', 'layout')
    return { ok: true, batch, changed: plan.changes.length }
  } catch (error) {
    if (error instanceof CatalogError) return { ok: false, messages: [error.message] }
    if (error instanceof StalePublicationError || isUniqueViolation(error)) {
      return { ok: false, messages: [STALE] }
    }
    log.error({ ...errorFields(error) }, 'price publication failed')
    return {
      ok: false,
      messages: ['Publikacja nie powiodła się — nic nie zmieniono. Szczegóły w logach.'],
    }
  }
}

const STALE =
  'W międzyczasie ktoś opublikował ceny — nic nie zmieniono. Odśwież stronę i sprawdź kolejkę jeszcze raz.'

/** Postgres unique violation (23505) anywhere in the cause chain: an exact race of two publications. */
function isUniqueViolation(error: unknown): boolean {
  for (let e: unknown = error, depth = 0; e && depth < 5; depth++) {
    if ((e as { code?: unknown }).code === '23505') return true
    e = (e as { cause?: unknown }).cause
  }
  return false
}
