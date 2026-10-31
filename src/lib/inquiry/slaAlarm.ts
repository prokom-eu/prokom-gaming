import { minutesInReplyHours, waitLabel, type ReplyHours } from './sla'

export const INQUIRY_SLA_TASK = 'inquiry-sla'

export type WaitingInquiry = { id: number; number: string; topic: string; createdAt: string }

/**
 * New inquiries that have waited `alarmMinutes` inside the reply hours (ADR-G008 pt 6). The caller
 * passes only `new` ones without `slaAlertedAt`, so each inquiry raises one alarm.
 */
export function dueAlarms<T extends WaitingInquiry>(
  inquiries: readonly T[],
  now: Date,
  hours: ReplyHours,
  alarmMinutes: number,
): (T & { waited: number })[] {
  return inquiries.flatMap((inquiry) => {
    const waited = minutesInReplyHours(inquiry.createdAt, now, hours)
    return waited >= alarmMinutes ? [{ ...inquiry, waited }] : []
  })
}

/**
 * The alarm e-mail to `ALERT_EMAIL`: number, topic and waiting time — never the customer's name,
 * e-mail or message (panel spec §14, §16). Push on the phone comes with `notify()` in P4.
 */
export function slaAlarmEmail(
  inquiry: WaitingInquiry & { waited: number },
  { to, panelUrl }: { to: string; panelUrl: string },
) {
  const wait = waitLabel(inquiry.waited)
  return {
    to,
    subject: `Bez odpowiedzi od ${wait}: ${inquiry.number}`,
    text: [
      `Zapytanie ${inquiry.number} (${inquiry.topic}) czeka na odpowiedź ${wait} w godzinach odpowiedzi.`,
      '',
      `Odpowiedz w panelu: ${panelUrl}`,
    ].join('\n'),
  }
}
