import { ORDER_STAGE_CHOICES, type OrderStage } from '../../lib/orders'
import type { IconName } from '../ui/icons'
import { shortName } from './rules'

/**
 * „Ostatnie zdarzenia” on the Pulpit (panel spec §3 pt 6): new inquiry, customer reply, SLA
 * alarm, price publication, order stage — read from the records themselves, no event log.
 * The margin alarm e-mail leaves no record (its job is deleted when done), so it is not listed.
 * Pure: the loader passes what it read.
 */

export type DashEvent = {
  key: string
  at: string
  icon: IconName
  title: string
  /** Who did it („krystian”), shown after the time. */
  by?: string
}

export type EventSources = {
  inquiries: readonly { id: number; createdAt: string; name: string; topic: string }[]
  replies: readonly { id: number; at: string; number: string }[]
  slaAlarms: readonly { id: number; slaAlertedAt: string; number: string }[]
  batches: readonly {
    batch: number
    publishedAt: string
    by: string | null
  }[]
  stages: readonly {
    id: number
    at: string
    number: string
    buildName: string | null
    stage: OrderStage
  }[]
}

export const EVENTS_SHOWN = 5

const stageLabel = (stage: OrderStage) =>
  ORDER_STAGE_CHOICES.find((c) => c.value === stage)?.label ?? stage

/** The newest events of all kinds, newest first. */
export function recentEvents(src: EventSources, limit = EVENTS_SHOWN): DashEvent[] {
  const events: DashEvent[] = [
    ...src.inquiries.map((i) => ({
      key: `inquiry:${i.id}`,
      at: i.createdAt,
      icon: 'mail' as const,
      title: `Nowe zapytanie: ${shortName(i.name)}, ${i.topic}`,
    })),
    // TODO(krystian): texts of the reply, SLA and stage events — not on the board.
    ...src.replies.map((r) => ({
      key: `reply:${r.id}`,
      at: r.at,
      icon: 'inbox' as const,
      title: `Odpowiedź klienta: ${r.number}`,
    })),
    ...src.slaAlarms.map((s) => ({
      key: `sla:${s.id}`,
      at: s.slaAlertedAt,
      icon: 'bell' as const,
      title: `Alarm: ${s.number} czeka na odpowiedź`,
    })),
    ...src.batches.map((b) => ({
      key: `batch:${b.batch}`,
      at: b.publishedAt,
      icon: 'check' as const,
      // TODO(krystian): the board adds „(16 zestawów, 57 opcji)” — every batch holds the full
      // offer, so the counts would not say what changed; left out until there is a change count.
      title: `Opublikowano partię cen #${b.batch}`,
      ...(b.by ? { by: b.by } : {}),
    })),
    ...src.stages.map((s) => ({
      key: `stage:${s.id}:${s.at}`,
      at: s.at,
      icon: 'wrench' as const,
      title: `${s.buildName ? `${s.buildName} (${s.number})` : s.number}: etap „${stageLabel(s.stage)}”`,
    })),
  ]
  return events
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at) || a.key.localeCompare(b.key))
    .slice(0, limit)
}
