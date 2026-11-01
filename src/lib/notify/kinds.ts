/**
 * Events the panel tells about (panel spec §14, ADR-G010 pt 5): which channel each one uses.
 * P7 adds `price_report` and `budget`, P5 `workshop` (role `serwis`).
 */
export const CHANNELS = {
  inquiry_new: { email: false, push: true },
  inquiry_reply: { email: false, push: true },
  inquiry_sla: { email: true, push: true },
  margin_alarm: { email: true, push: true },
  mail_error: { email: true, push: false },
  // P7: a price report with an alarm (minimum, part of a build unavailable, big cost change).
  price_report: { email: true, push: true },
  // P7: the monthly Claude limit stopped a price check.
  budget: { email: true, push: false },
} as const satisfies Record<string, { email: boolean; push: boolean }>

export type NotifyKind = keyof typeof CHANNELS

/** Kinds a device can choose (`push-subscriptions.kinds`), in the order of Settings. */
export const PUSH_KINDS = [
  'inquiry_new',
  'inquiry_reply',
  'inquiry_sla',
  'margin_alarm',
  'price_report',
] as const satisfies readonly NotifyKind[]
export type PushKind = (typeof PUSH_KINDS)[number]

// TODO(krystian): labels of the kinds in Settings → Powiadomienia (no board).
export const PUSH_KIND_LABELS: Record<PushKind, string> = {
  inquiry_new: 'Nowe zapytanie',
  inquiry_reply: 'Odpowiedź klienta w wątku',
  inquiry_sla: 'Zapytanie bez odpowiedzi',
  margin_alarm: 'Marża poniżej minimum',
  price_report: 'Raport cen z alarmem',
}

/** Roles that see each kind: inquiries and margins are `admin` only (spec §15). */
export const KIND_ROLES: Record<PushKind, readonly ('admin' | 'serwis')[]> = {
  inquiry_new: ['admin'],
  inquiry_reply: ['admin'],
  inquiry_sla: ['admin'],
  margin_alarm: ['admin'],
  price_report: ['admin'],
}

export const NOTIFY_SEND_TASK = 'notify-send'
