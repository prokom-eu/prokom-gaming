import { sql, type PostgresAdapter } from '@payloadcms/db-postgres'
import type { PayloadRequest } from 'payload'

/** Prefix of the inquiry number (ADR-G005; PKG = PRO-KOM Gaming). */
export const NUMBER_PREFIX = 'PKG'

const yearFormat = new Intl.DateTimeFormat('pl-PL', { timeZone: 'Europe/Warsaw', year: 'numeric' })

/** Calendar year in Poland: an inquiry sent at 00:30 on 1 January belongs to the new year. */
export function yearInPoland(date: Date): number {
  return Number(yearFormat.format(date))
}

/** `PKG-2026-0042`; four digits at least, more after 9999 in one year (never cut). */
export function formatInquiryNumber(year: number, seq: number): string {
  if (!Number.isInteger(seq) || seq < 1) throw new Error(`Invalid inquiry sequence: ${seq}`)
  return `${NUMBER_PREFIX}-${year}-${String(seq).padStart(4, '0')}`
}

/** Yearly counter tables (outside Payload's schema): inquiries (G6) and orders (G14). */
export type YearlyCounter = 'inquiry_counters' | 'order_counters'

/**
 * Next number in the year from a counter table. The upsert locks the year's row until the
 * transaction ends, so two records never share a number, and it runs in the transaction of the
 * insert (`req`): when the insert fails, the counter rolls back with it — no gaps within a year
 * (G6 brief). Payload's `create` always opens that transaction.
 */
export async function nextYearlySeq(
  req: PayloadRequest,
  counter: YearlyCounter,
  year: number,
): Promise<number> {
  const adapter = req.payload.db as unknown as PostgresAdapter
  const transactionID = req.transactionID ? await req.transactionID : undefined
  const db = (transactionID !== undefined && adapter.sessions[transactionID]?.db) || adapter.drizzle
  const table = sql.identifier(counter)
  const result = await db.execute<{ last: number }>(sql`
    INSERT INTO ${table} ("year", "last") VALUES (${year}, 1)
    ON CONFLICT ("year") DO UPDATE SET "last" = ${table}."last" + 1
    RETURNING "last"
  `)
  const last = result.rows[0]?.last
  if (typeof last !== 'number') throw new Error(`Counter ${counter} returned no value`)
  return last
}

/** Next inquiry number in the year (`inquiry_counters`, migration `inquiries`). */
export function nextInquirySeq(req: PayloadRequest, year: number): Promise<number> {
  return nextYearlySeq(req, 'inquiry_counters', year)
}
