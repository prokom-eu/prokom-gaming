import { IconClock, IconDoc, IconShield, IconTruck } from './icons'

/** The promises under the price — the build page and the configurator summary (spec. §6–§7). */
export const PROMISES = [
  { icon: IconClock, text: 'Gotowy w 5–10 dni roboczych' },
  { icon: IconTruck, text: 'Wysyłka w cenie albo odbiór w sklepie' },
  { icon: IconDoc, text: 'Metryka z wynikami tego egzemplarza' },
  { icon: IconShield, text: '2 lata gwarancji, kurier odbiera od Ciebie' },
]

/** When we answer (spec. „Odpowiedź na zapytanie”) — the header's second line (NAWIGACJA.md §2.1). */
export const RESPONSE_HOURS = 'codziennie 8–22'
