'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { eraseClient, exportClient } from '../../lib/clientData.server'
import type { ClientEntry } from '../../lib/clients'
import { addInquiryNote } from '../../lib/inquiry/thread.server'
import { errorFields, log } from '../../lib/logger'
import { panelActionSession } from '../session'
import { emailOf } from './load'

/**
 * Actions of the client card (panel spec §6). Admin only (ADR-G006 pt 3). The client is named by a
 * record id — the e-mail is looked up here and never travels from the browser or into a log.
 */

// TODO(krystian): texts of the results — not on the board.
const DENIED = 'Brak uprawnień — zaloguj się do panelu.'
const FAILED = 'Nie udało się. Spróbuj ponownie.'
const GONE = 'Nie ma już danych tego klienta.'

const Entry = z.object({
  kind: z.enum(['konto', 'zapytanie', 'zamowienie']),
  id: z.number().int().positive(),
})

export type ActionResult = { ok: true; message?: string } | { ok: false; message: string }

async function open(rawEntry: unknown) {
  const session = await panelActionSession('admin')
  if (!session) return { error: DENIED } as const
  const entry = Entry.safeParse(rawEntry)
  if (!entry.success) return { error: FAILED } as const
  const email = await emailOf(session.payload, entry.data as ClientEntry)
  if (!email) return { error: GONE } as const
  return { ...session, entry: entry.data, email } as const
}

/** „Nowa notatka”: into the account when there is one, else the newest inquiry's thread. */
export async function saveClientNote(raw: {
  entry: ClientEntry
  target: 'account' | 'inquiry'
  id: number
  text: string
}): Promise<ActionResult> {
  const found = await open(raw.entry)
  if ('error' in found) return { ok: false, message: found.error ?? FAILED }
  const input = z
    .object({
      target: z.enum(['account', 'inquiry']),
      id: z.number().int().positive(),
      text: z.string().max(5000),
    })
    .safeParse(raw)
  if (!input.success) return { ok: false, message: FAILED }
  const { target, id, text } = input.data
  const { payload, user } = found
  try {
    if (target === 'account') {
      const account = await payload.findByID({
        collection: 'customers',
        id,
        select: { email: true },
        depth: 0,
        overrideAccess: true,
        disableErrors: true,
      })
      // The note must belong to the client of this card.
      if (!account || account.email !== found.email) return { ok: false, message: GONE }
      await payload.update({
        collection: 'customers',
        id,
        data: { notes: text.trim() || null },
        depth: 0,
        user,
        overrideAccess: false,
      })
    } else {
      const inquiry = await payload.findByID({
        collection: 'inquiries',
        id,
        select: { email: true },
        depth: 0,
        overrideAccess: true,
        disableErrors: true,
      })
      if (!inquiry || inquiry.email !== found.email) return { ok: false, message: GONE }
      const result = await addInquiryNote(payload, { inquiryId: id, body: text, user })
      // TODO(krystian): text — not on the board.
      if (!result.ok) return { ok: false, message: 'Wpisz treść notatki.' }
    }
  } catch (error) {
    log.error({ target, id, ...errorFields(error) }, 'clients: note not saved')
    return { ok: false, message: FAILED }
  }
  revalidatePath('/admin/klient')
  return { ok: true, message: 'Notatka zapisana.' }
}

/** „Eksport danych klienta (RODO)” — the JSON the panel offers as a file. */
export async function exportClientData(
  raw: ClientEntry,
): Promise<{ ok: true; json: string; fileName: string } | { ok: false; message: string }> {
  const found = await open(raw)
  if ('error' in found) return { ok: false, message: found.error ?? FAILED }
  try {
    const now = new Date()
    const data = await exportClient(found.payload, found.email, now)
    log.info(
      { entry: found.entry.kind, id: found.entry.id, user: found.user.id },
      'clients: export',
    )
    // No name or e-mail in the file name: it lands in the downloads folder.
    const fileName = `klient-${found.entry.kind}-${found.entry.id}-${now.toISOString().slice(0, 10)}.json`
    return { ok: true, json: JSON.stringify(data, null, 2), fileName }
  } catch (error) {
    log.error(
      { entry: found.entry.kind, id: found.entry.id, ...errorFields(error) },
      'clients: export failed',
    )
    return { ok: false, message: FAILED }
  }
}

/**
 * „Usuń dane na żądanie” after the confirmation in the panel: deletes inquiries (with threads and
 * the trail), tickets and the account, anonymises orders and units — all or nothing.
 */
export async function eraseClientData(raw: {
  entry: ClientEntry
  confirm: boolean
}): Promise<ActionResult> {
  if (raw.confirm !== true) return { ok: false, message: FAILED }
  const found = await open(raw.entry)
  if ('error' in found) return { ok: false, message: found.error ?? FAILED }
  try {
    const summary = await eraseClient(found.payload, found.email, found.user)
    log.info({ user: found.user.id, ...summary }, 'clients: erased on request')
  } catch (error) {
    log.error(
      { entry: found.entry.kind, id: found.entry.id, ...errorFields(error) },
      'clients: erase failed',
    )
    // TODO(krystian): text — not on the board.
    return {
      ok: false,
      message: 'Nie udało się usunąć — nic nie zostało zmienione. Spróbuj ponownie.',
    }
  }
  revalidatePath('/admin/klienci')
  revalidatePath('/admin/zapytania')
  revalidatePath('/admin/zamowienia')
  return { ok: true }
}
