import 'server-only'

import { percent, zl } from './format'
import { problemMessage, type BuildRow, type LevelBelowMinProblem } from './publish'

/**
 * Margin alarm (ADR-G002 §4.4): when costs went up and a price that is on the site today breaks
 * the minimum margin, the system does not change the price — it e-mails `ALERT_EMAIL` with the
 * levels, the builds and the fix. Pure: the job decides when to send and sends.
 */

export type AlarmMail = { subject: string; text: string }

/** `null` when every published price holds the margin — nothing to send. */
export function marginAlarmMail(
  broken: readonly LevelBelowMinProblem[],
  builds: readonly BuildRow[],
  minMargin: number,
  screenPath: string,
): AlarmMail | null {
  if (broken.length === 0) return null
  const levels = new Set(broken.map((p) => p.level))
  const affected = builds.filter(
    (b) => levels.has(b.config.level) || (b.margin !== null && b.margin < minMargin),
  )
  const lines = [
    `Opublikowane ceny przy dzisiejszych kosztach łamią marżę minimalną ${percent(minMargin)}.`,
    'Ceny na stronie się nie zmieniły — oferta wiąże dopiero po wysłaniu klientowi (ważna 48 h).',
    '',
    'Poziomy:',
    ...broken.map((p) => `- ${problemMessage(p, minMargin)}`),
  ]
  if (affected.length > 0) {
    lines.push(
      '',
      'Gotowe zestawy na tych poziomach (cena na stronie / koszt dziś / marża):',
      ...affected.map((b) => `- ${b.name}: ${zl(b.price)} / ${zl(b.cost)} / ${percent(b.margin)}`),
    )
  }
  lines.push('', `Zatwierdź nowe ceny w panelu: „Ceny — publikacja i marże” (${screenPath}).`)
  return {
    subject: `PILNE: marża poniżej ${percent(minMargin)} — ${[...levels].join(', ')}`,
    text: lines.join('\n'),
  }
}
