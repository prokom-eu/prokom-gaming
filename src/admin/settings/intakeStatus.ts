import { whenLabel } from '../inquiries/format'

/**
 * A run every 2 minutes: no good read for this long means reading stopped — also when the job
 * itself got stuck (e.g. a restart mid-run leaves it „processing”, and no error is counted).
 */
export const STALE_MINUTES = 10

export type IntakeStatus = {
  /** The board's line („pobierane co 2 min (IMAP)”) or why reading is off. */
  value: string
  /** One line under it about the last run, or `null`. */
  note: string | null
  tone: 'ok' | 'bad' | 'mu'
}

/**
 * „Odpowiedzi klientów” in Settings → Zapytania i poczta (board Ustawienia, ADR-G008): on or off,
 * the last good read and errors in a row. Pure — the view passes env and the intake state.
 */
export function intakeStatus(
  enabled: boolean,
  state: { lastOkAt?: string | null; errorCount?: number | null },
  now: Date,
): IntakeStatus {
  // TODO(krystian): texts other than the board's „pobierane co 2 min (IMAP)”.
  if (!enabled) {
    return {
      value: 'odbiór wyłączony — brak ustawień IMAP',
      note: 'Odpowiedzi klientów czytasz w zwykłej poczcie; wysyłka z panelu działa.',
      tone: 'mu',
    }
  }
  const value = 'pobierane co 2 min (IMAP)'
  const errors = state.errorCount ?? 0
  const lastOk = state.lastOkAt ? `ostatni udany odczyt: ${whenLabel(state.lastOkAt, now)}` : null
  if (errors > 0) {
    return {
      value,
      note: [`błąd odczytu skrzynki (${errors} z rzędu)`, lastOk].filter(Boolean).join(' · '),
      tone: 'bad',
    }
  }
  if (state.lastOkAt && now.getTime() - Date.parse(state.lastOkAt) > STALE_MINUTES * 60_000) {
    return { value, note: `brak odczytu od ponad ${STALE_MINUTES} min · ${lastOk}`, tone: 'bad' }
  }
  return { value, note: lastOk ?? 'pierwszy odczyt w ciągu 2 minut', tone: lastOk ? 'ok' : 'mu' }
}
