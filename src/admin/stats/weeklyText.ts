import { percentShort, zl } from '../../lib/pricing/format'
import { dayKey } from '../dashboard/rules'
import { num, pct } from './model'

/**
 * The Monday report (panel spec §13, P8) — pure parts: when it is due and its text. Counts,
 * money and margins in percent only: no names, e-mails, inquiry numbers or purchase costs.
 */

/** Monday from 07:00 Polish time, once per Monday (a late server still sends that day). */
export function isWeeklyDue(now: Date, sentAt: string | null | undefined): boolean {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Warsaw',
    weekday: 'short',
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now)
  const weekday = parts.find((p) => p.type === 'weekday')?.value
  const hour = Number(parts.find((p) => p.type === 'hour')?.value)
  if (weekday !== 'Mon' || hour < 7) return false
  return !sentAt || dayKey(sentAt) !== dayKey(now)
}

export type WeeklyData = {
  /** First and last day of the week, `YYYY-MM-DD`. */
  from: string
  to: string
  /** `off` = not in the report (switched off or no Umami); `missing` = Umami did not answer. */
  traffic: { visitors: number; conversion: number | null } | 'off' | 'missing'
  sales: { inquiries: number; offered: number; orders: number; revenue: number }
  /** `off` = switched off; `missing` = the margins could not be computed. */
  prices:
    | {
        average: number | null
        lowest: number | null
        minMargin: number
        queue: number
      }
    | 'off'
    | 'missing'
  /** Link to the statistics screen. */
  statsUrl: string
}

const short = (day: string) => `${Number(day.slice(8, 10))}.${day.slice(5, 7)}`

// TODO(krystian): the subject and the text of the report — no board, our wording.
export function weeklyReportText(data: WeeklyData): { subject: string; text: string } {
  const range = `${short(data.from)}–${short(data.to)}.${data.to.slice(0, 4)}`
  const lines: string[] = [`Raport tygodniowy PRO-KOM Gaming, ${range}.`, '']

  if (data.traffic !== 'off') {
    lines.push('Ruch na stronie (Umami, bez ciasteczek)')
    if (data.traffic === 'missing') {
      lines.push('- statystyki ruchu nie odpowiedziały')
    } else {
      lines.push(`- odwiedzający: ${num(data.traffic.visitors)}`)
      lines.push(`- konwersja na zapytania: ${pct(data.traffic.conversion, 2)}`)
    }
    lines.push('')
  }

  lines.push('Sprzedaż')
  lines.push(`- zapytania: ${num(data.sales.inquiries)}`)
  lines.push(`- z ofertą: ${num(data.sales.offered)}`)
  lines.push(`- opłacone zamówienia: ${num(data.sales.orders)}`)
  lines.push(`- przychód: ${zl(data.sales.revenue)}`)
  lines.push('')

  if (data.prices !== 'off') {
    lines.push('Ceny i marże (dzisiejsze koszty)')
    if (data.prices === 'missing') {
      lines.push('- nie udało się policzyć marż — sprawdź Centrum cen')
    } else {
      const { average, lowest, minMargin, queue } = data.prices
      const alarm = lowest !== null && lowest < minMargin ? ' — poniżej minimum' : ''
      lines.push(`- średnia marża gotowców: ${percentShort(average)}`)
      lines.push(
        `- najniższa marża w konfiguratorze: ${percentShort(lowest)} (minimum ${percentShort(minMargin)})${alarm}`,
      )
      lines.push(`- do zatwierdzenia: ${num(queue)}`)
    }
    lines.push('')
  }

  lines.push(`Szczegóły: ${data.statsUrl}`)
  return { subject: `Raport tygodniowy · ${range}`, text: lines.join('\n') }
}
