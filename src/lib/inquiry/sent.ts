import type { SentSummary } from './form'

/**
 * „Twoja konfiguracja” on `/zapytanie/wyslane` comes from this tab's `sessionStorage`, written
 * right after the API accepted the inquiry. The page never reads an inquiry by its number: numbers
 * follow each other, so anyone could look at other people's inquiries.
 */
const KEY = 'pkg:inquiry-sent'

export function saveSent(number: string, summary: SentSummary): void {
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify({ number, summary }))
  } catch {
    // Private mode or a full quota: the page shows the number without the configuration.
  }
}

/** The summary saved for this number; `null` in another tab, after a reload elsewhere, or if broken. */
export function readSent(number: string): SentSummary | null {
  try {
    const value: unknown = JSON.parse(window.sessionStorage.getItem(KEY) ?? 'null')
    if (!value || typeof value !== 'object') return null
    const saved = value as { number?: unknown; summary?: SentSummary }
    if (saved.number !== number || !saved.summary || !Array.isArray(saved.summary.rows)) return null
    return saved.summary
  } catch {
    return null
  }
}
