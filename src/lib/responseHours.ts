/**
 * The header's second line „codziennie 9–22” (NAWIGACJA.md §2.1) comes from the panel's
 * „Odpowiedź na zapytanie” (`site-settings.responseTime`, e.g. „zwykle w godzinę, codziennie
 * 9–22”) — the same text the confirmation e-mail uses — so changing the hours in the panel changes
 * both. Anything without „codziennie …” falls back to the constant.
 */
export const RESPONSE_HOURS = 'codziennie 9–22'

export function responseHours(text: string | null | undefined): string {
  const match = /codziennie\s+\d{1,2}\s*[–-]\s*\d{1,2}/i.exec(text ?? '')
  return match ? match[0].replace(/\s*[–-]\s*/, '–').replace(/^C/, 'c') : RESPONSE_HOURS
}
