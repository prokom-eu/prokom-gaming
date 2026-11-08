import 'server-only'

import {
  commitTransaction,
  createLocalReq,
  initTransaction,
  killTransaction,
  type Payload,
  type Where,
} from 'payload'

import type { User } from '../payload-types'
import { erasedEmail, unmatchedWhere } from './clients'
import { normalizeEmail } from './email'

/**
 * GDPR tools of the client card (panel spec §6): export and erasure on request of everything
 * stored under one normalised e-mail. Admin only — the panel action checks the role first.
 *
 * Erasure (decision Krystian 01.11.2026): inquiries with their threads (the G6 path — the
 * `inquiries` hooks delete the thread and write the trail in `inquiry-deletions`), mail from the
 * client in „Nieprzypisane”, tickets and the customer account are **deleted**; orders and units
 * are **anonymised** — number, build, price and the certificate stay (proof of sale, the code on
 * the sticker), the name, e-mail and links to the person go.
 */

// TODO(krystian): the name left in an anonymised order — not on any board.
export const ERASED_NAME = 'Dane usunięte'

const byEmail = (email: string): Where => ({ email: { equals: normalizeEmail(email) } })

const all = { pagination: false, depth: 0, overrideAccess: true } as const

export type ClientExport = {
  exportedAt: string
  email: string
  inquiries: unknown[]
  inquiryMessages: unknown[]
  unmatchedMail: unknown[]
  orders: unknown[]
  units: unknown[]
  tickets: unknown[]
  customers: unknown[]
  /** Devices with notifications belong to panel accounts only — never to a customer. */
  pushSubscriptions: unknown[]
}

/** „Eksport danych” — every record of the client as JSON (no passwords or tokens). */
export async function exportClient(
  payload: Payload,
  email: string,
  now: Date,
): Promise<ClientExport> {
  const where = byEmail(email)
  const [inquiries, orders, units, tickets, customers] = await Promise.all([
    payload.find({ collection: 'inquiries', where, ...all }),
    payload.find({ collection: 'orders', where, ...all }),
    payload.find({ collection: 'units', where, ...all }),
    payload.find({ collection: 'tickets', where, ...all }),
    payload.find({ collection: 'customers', where, ...all }),
  ])
  const ids = inquiries.docs.map((i) => i.id)
  const [messages, unmatched] = await Promise.all([
    ids.length
      ? payload.find({ collection: 'inquiry-messages', where: { inquiry: { in: ids } }, ...all })
      : { docs: [] },
    payload.find({
      collection: 'mail-intake-unmatched',
      where: unmatchedWhere(email, ids),
      ...all,
    }),
  ])
  return {
    exportedAt: now.toISOString(),
    email: normalizeEmail(email),
    inquiries: inquiries.docs,
    inquiryMessages: messages.docs,
    unmatchedMail: unmatched.docs,
    orders: orders.docs,
    units: units.docs,
    tickets: tickets.docs,
    // Auth fields (hash, salt, tokens) are hidden by Payload; drop the session list too.
    customers: customers.docs.map(({ sessions: _sessions, ...rest }) => rest),
    pushSubscriptions: [],
  }
}

export type EraseSummary = {
  inquiries: number
  unmatchedMail: number
  tickets: number
  customers: number
  ordersAnonymised: number
  unitsAnonymised: number
}

/** „Usuń dane na żądanie” — in one transaction: all of it, or nothing. Logs counts only. */
export async function eraseClient(
  payload: Payload,
  email: string,
  user: User,
): Promise<EraseSummary> {
  const where = byEmail(email)
  const req = await createLocalReq({ user: { ...user, collection: 'users' } }, payload)
  const local = { req, overrideAccess: true, depth: 0 } as const
  await initTransaction(req)
  try {
    const inquiries = await payload.find({ collection: 'inquiries', where, ...all, req })
    const ids = inquiries.docs.map((i) => i.id)

    // Tickets point at units and the account: they go first.
    const tickets = await payload.delete({ collection: 'tickets', where, ...local })

    const orders = await payload.find({ collection: 'orders', where, ...all, req })
    for (const o of orders.docs) {
      await payload.update({
        collection: 'orders',
        id: o.id,
        data: {
          name: ERASED_NAME,
          email: erasedEmail('order', o.id),
          customer: null,
          inquiry: null,
          trackingNumber: null,
          workshopNote: null,
        },
        ...local,
      })
    }
    const units = await payload.find({ collection: 'units', where, ...all, req })
    for (const u of units.docs) {
      await payload.update({
        collection: 'units',
        id: u.id,
        data: { email: erasedEmail('unit', u.id), customer: null },
        ...local,
      })
    }

    const unmatched = await payload.delete({
      collection: 'mail-intake-unmatched',
      where: unmatchedWhere(email, ids),
      ...local,
    })
    // The G6 path: the hooks delete the thread and write the trail (reason „request”, who).
    const deleted = ids.length
      ? await payload.delete({ collection: 'inquiries', where: { id: { in: ids } }, ...local })
      : { docs: [], errors: [] }
    const customers = await payload.delete({ collection: 'customers', where, ...local })

    const failed = [tickets, unmatched, deleted, customers].some((r) => r.errors.length > 0)
    if (failed) throw new Error('Client erasure: some records were not deleted')
    await commitTransaction(req)
    return {
      inquiries: deleted.docs.length,
      unmatchedMail: unmatched.docs.length,
      tickets: tickets.docs.length,
      customers: customers.docs.length,
      ordersAnonymised: orders.docs.length,
      unitsAnonymised: units.docs.length,
    }
  } catch (error) {
    await killTransaction(req)
    throw error
  }
}
