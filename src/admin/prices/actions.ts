'use server'

import config from '@payload-config'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { getPayload } from 'payload'
import type { Payload } from 'payload'
import { z } from 'zod'

import { isPanelUser } from '../../access/panel'
import { errorFields, log } from '../../lib/logger'
import { CatalogError } from '../../lib/pricing/catalog'
import { previewCostImport, type ImportPreview } from '../../lib/pricing/csv'
import { planPublication, problemMessage } from '../../lib/pricing/publish'
import {
  applyCostImport,
  loadBatch,
  loadImportData,
  loadOffer,
  StalePublicationError,
  writeBatch,
} from '../../lib/pricing/store'
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
  const session = await panelSession()
  if (!session) return { ok: false, messages: [NO_ACCESS] }
  const { payload, user } = session
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

    const { batch } = await writeBatch(payload, plan, user, current.snapshot.batch)
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

// --- Cost import (ADR-G002 §4.1) ---

export type CostImportPreviewResult =
  { ok: true; preview: ImportPreview } | { ok: false; messages: string[] }

export type CostImportResult =
  { ok: true; options: number; levels: number } | { ok: false; messages: string[] }

// ~2000 rows of "code;cost" fit easily; anything bigger is not a cost list.
const csvInput = z.object({ text: z.string().min(1).max(200_000) })

/** "Pokaż zmiany": parse and match the pasted CSV against today's offer. Nothing is written. */
export async function previewCosts(raw: unknown): Promise<CostImportPreviewResult> {
  const session = await panelSession()
  if (!session) return { ok: false, messages: [NO_ACCESS] }
  const parsed = csvInput.safeParse(raw)
  if (!parsed.success) return { ok: false, messages: ['Wklej listę kosztów (maks. 200 KB).'] }

  const { options, levels } = await loadImportData(session.payload)
  return { ok: true, preview: previewCostImport(parsed.data.text, options, levels) }
}

/**
 * "Zapisz koszty": the same text is parsed and matched again (the preview in the browser is not
 * trusted) and written only when every row is valid.
 */
export async function importCosts(raw: unknown): Promise<CostImportResult> {
  const session = await panelSession()
  if (!session) return { ok: false, messages: [NO_ACCESS] }
  const parsed = csvInput.safeParse(raw)
  if (!parsed.success) return { ok: false, messages: ['Wklej listę kosztów (maks. 200 KB).'] }
  const { payload, user } = session

  try {
    const { options, levels } = await loadImportData(payload)
    const preview = previewCostImport(parsed.data.text, options, levels)
    if (preview.errors.length > 0) {
      return {
        ok: false,
        messages: ['Popraw błędne wiersze — nic nie zapisano.', ...preview.errors.map(rowMessage)],
      }
    }
    if (preview.changes.length === 0) {
      return { ok: false, messages: ['Wszystkie koszty są już takie same — nic do zapisania.'] }
    }
    const written = await applyCostImport(payload, preview.changes, user)
    log.info({ ...written, rows: preview.changes.length, userId: user.id }, 'costs imported')
    revalidatePath('/admin/ceny')
    return { ok: true, ...written }
  } catch (error) {
    if (error instanceof CatalogError) return { ok: false, messages: [error.message] }
    log.error({ ...errorFields(error) }, 'cost import failed')
    return {
      ok: false,
      messages: ['Import nie powiódł się — nic nie zmieniono. Szczegóły w logach.'],
    }
  }
}

const NO_ACCESS = 'Brak uprawnień — zaloguj się do panelu.'

const rowMessage = (e: { line: number; message: string }) =>
  e.line > 0 ? `Wiersz ${e.line}: ${e.message}` : e.message

/** The signed-in panel account (`users`), or `null`. */
async function panelSession(): Promise<{ payload: Payload; user: User } | null> {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })
  if (!user || !isPanelUser({ user })) return null
  return { payload, user: user as User }
}
