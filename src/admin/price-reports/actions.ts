'use server'

import { after } from 'next/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { queueMarginAlarm } from '../../jobs/queue'
import { PRICE_CHECK_QUEUE } from '../../jobs/priceCheck'
import { errorFields, log } from '../../lib/logger'
import { acceptProposals as accept } from '../../lib/price-check/accept'
import type { CheckDiff } from '../../lib/price-check/diff'
import { startPriceCheck } from '../../lib/price-check/scheduler'
import { panelActionSession } from '../session'

const NO_ACCESS = 'Brak uprawnień — zaloguj się do panelu.'

export type StartResult = { ok: true; id: number } | { ok: false; message: string }

/**
 * „Sprawdź ceny” (panel spec §11): a new check runs in the background (queue `long`); the
 * browser goes to its report, which shows the progress.
 */
export async function startCheck(): Promise<StartResult> {
  const session = await panelActionSession('admin')
  if (!session) return { ok: false, message: NO_ACCESS }
  const { payload, user } = session
  const started = await startPriceCheck(payload, 'manual')
  if (!started.ok) {
    // TODO(krystian): messages not on the board.
    return {
      ok: false,
      message:
        started.reason === 'running'
          ? 'Sprawdzanie cen już trwa — poczekaj na raport.'
          : 'Sprawdzanie cen jest wyłączone: brak klucza ANTHROPIC_API_KEY na serwerze.',
    }
  }
  log.info({ checkId: started.id, userId: user.id }, 'price check started')
  // Right after the response, not at the next minute of the cron; never blocks the request.
  after(async () => {
    try {
      await payload.jobs.run({ queue: PRICE_CHECK_QUEUE, limit: 1, overrideAccess: true })
    } catch (error) {
      log.error({ ...errorFields(error) }, 'price check run failed to start')
    }
  })
  return { ok: true, id: started.id }
}

export type AcceptResult =
  { ok: true; options: number; levels: number; skipped: number } | { ok: false; message: string }

const acceptInput = z.object({ checkId: z.number().int().positive() })

/**
 * „Przyjmij N propozycji”: the proposed costs go in like a CSV import (market items only), then
 * the margin alarm check runs at once — the queue and the guard do the rest. Once per report.
 */
export async function acceptCheck(raw: unknown): Promise<AcceptResult> {
  const session = await panelActionSession('admin')
  if (!session) return { ok: false, message: NO_ACCESS }
  const parsed = acceptInput.safeParse(raw)
  if (!parsed.success) return { ok: false, message: 'Nieprawidłowe dane.' }
  const { payload, user } = session
  try {
    const check = await payload.findByID({
      collection: 'price-checks',
      id: parsed.data.checkId,
      depth: 0,
      overrideAccess: true,
    })
    if (check.status !== 'done' || !check.diff) {
      return { ok: false, message: 'Ten raport nie ma propozycji do przyjęcia.' }
    }
    if (check.acceptedAt) return { ok: false, message: 'Propozycje z tego raportu już przyjęto.' }
    // Claim the report first: a second click (another tab) finds it accepted.
    await payload.update({
      collection: 'price-checks',
      id: check.id,
      data: { acceptedAt: new Date().toISOString() },
      depth: 0,
      overrideAccess: true,
    })
    let written
    try {
      written = await accept(payload, check.diff as CheckDiff, user)
    } catch (error) {
      await payload.update({
        collection: 'price-checks',
        id: check.id,
        data: { acceptedAt: null },
        depth: 0,
        overrideAccess: true,
      })
      throw error
    }
    log.info({ checkId: check.id, ...written, userId: user.id }, 'price proposals accepted')
    try {
      const jobId = await queueMarginAlarm(payload, 'price check accepted')
      await payload.jobs.runByID({ id: jobId, overrideAccess: true })
    } catch (error) {
      log.error({ ...errorFields(error) }, 'margin alarm after accepting failed')
    }
    revalidatePath('/admin', 'layout')
    return { ok: true, ...written }
  } catch (error) {
    log.error({ ...errorFields(error) }, 'accepting price proposals failed')
    return { ok: false, message: 'Nie udało się przyjąć — nic nie zmieniono. Szczegóły w logach.' }
  }
}
