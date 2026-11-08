import type { Tone } from '../ui/Chip'

/** Status of a price check as a chip (panel spec §2: colour and text). */
export const STATUS: Record<
  'running' | 'done' | 'failed' | 'budget',
  { tone: Tone; label: string }
> = {
  running: { tone: 'info', label: 'W toku' },
  done: { tone: 'ok', label: 'Zakończone' },
  failed: { tone: 'bad', label: 'Błąd' },
  budget: { tone: 'warn', label: 'Limit wydatków' },
}

const fmt = new Intl.DateTimeFormat('pl-PL', {
  timeZone: 'Europe/Warsaw',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

/** „30.10.2026, 06:00”. */
export const dateTime = (iso: string) => fmt.format(new Date(iso))

const long = new Intl.DateTimeFormat('pl-PL', {
  timeZone: 'Europe/Warsaw',
  weekday: 'long',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})
const time = new Intl.DateTimeFormat('pl-PL', {
  timeZone: 'Europe/Warsaw',
  hour: '2-digit',
  minute: '2-digit',
})

/** „Piątek, 30.10.2026, start 06:00” (board Raport). */
export function startLine(iso: string): string {
  const d = new Date(iso)
  const day = long.format(d)
  return `${day.charAt(0).toUpperCase()}${day.slice(1)}, start ${time.format(d)}`
}
