import 'server-only'

import type { Payload } from 'payload'

import {
  BOARD_STAGES,
  boardStripText,
  CHECKLIST_ITEMS,
  isOrderStage,
  nextStage,
  stageLabel,
  STAGE_MAIL_STAGES,
  type OrderStage,
} from '../../lib/orders'
import { shortName } from '../dashboard/rules'
import { boardTiles, inStageLabel, promiseLabel, type BoardTiles } from './board'

/** A shipped order stays in the „Wysłane” column this long. TODO(krystian): how long. */
export const SHIPPED_ON_BOARD_DAYS = 14

export type BoardCard = {
  id: number
  number: string
  name: string
  price: number | null
  stage: OrderStage
  stageText: string
  due: string | null
  inStage: string | null
  note: string | null
  build: { name: string; slug: string; key: string } | null
  strip: string | null
  next: { stage: OrderStage; label: string; mails: boolean } | null
  checklist: { key: string; label: string; done: boolean }[]
  unitCode: string | null
}

export type BoardData = {
  tiles: BoardTiles
  promise: string | null
  columns: { stage: OrderStage; label: string; cards: BoardCard[] }[]
  stageEmail: boolean
  /** The order shown in the panel first: the nearest due date still to ship. */
  firstId: number | null
}

const shortDate = new Intl.DateTimeFormat('pl-PL', {
  timeZone: 'Europe/Warsaw',
  day: 'numeric',
  month: 'numeric',
})

type Rel<T> = number | T | null | undefined
const obj = <T>(value: Rel<T>): T | null => (typeof value === 'object' && value ? value : null)

/**
 * Data of /admin/zamowienia (panel spec §7) in one read. Never costs or margins; sale prices only
 * for the admin (`prices`) — the `serwis` role sees no amounts (spec §15, like its Pulpit in P2).
 * Reads are trusted: the view checked the role.
 */
export async function loadBoard(
  payload: Payload,
  now: Date,
  { prices }: { prices: boolean },
): Promise<BoardData> {
  const shippedSince = new Date(now.getTime() - SHIPPED_ON_BOARD_DAYS * 86_400_000).toISOString()
  const [orders, site, mail] = await Promise.all([
    payload.find({
      collection: 'orders',
      where: {
        or: [
          { stage: { in: BOARD_STAGES.filter((s) => s !== 'shipped') } },
          {
            and: [
              { stage: { equals: 'shipped' } },
              { stageChangedAt: { greater_than_equal: shippedSince } },
            ],
          },
        ],
      },
      select: {
        number: true,
        name: true,
        price: true,
        stage: true,
        dueDate: true,
        stageChangedAt: true,
        workshopNote: true,
        build: true,
        unit: true,
        checklist: true,
      },
      populate: {
        builds: { name: true, slug: true, creature: { key: true } },
        units: { code: true },
      },
      sort: 'dueDate',
      pagination: false,
      depth: 1,
      overrideAccess: true,
    }),
    payload.findGlobal({
      slug: 'site-settings',
      select: { fulfilment: true },
      depth: 0,
      overrideAccess: true,
    }),
    payload.findGlobal({
      slug: 'mail-settings',
      select: { stageEmail: true },
      depth: 0,
      overrideAccess: true,
    }),
  ])
  // The average needs shipped orders older than the board shows.
  const shipped = await payload.find({
    collection: 'orders',
    where: { stage: { in: ['shipped', 'delivered'] } },
    select: { stage: true, price: true, dueDate: true, stageChangedAt: true, stageHistory: true },
    sort: '-stageChangedAt',
    limit: 20,
    depth: 0,
    overrideAccess: true,
  })

  const cards: BoardCard[] = orders.docs.flatMap((o) => {
    if (!isOrderStage(o.stage)) return []
    const build = obj(o.build)
    const b = build
      ? { name: build.name, slug: build.slug, key: obj(build.creature)?.key ?? build.slug }
      : null
    const done = new Map((o.checklist ?? []).map((c) => [c.key, Boolean(c.done)]))
    const next = nextStage(o.stage)
    return [
      {
        id: o.id,
        number: o.number ?? `#${o.id}`,
        name: shortName(o.name),
        price: prices ? (o.price ?? null) : null,
        stage: o.stage,
        stageText: stageLabel(o.stage),
        due: o.dueDate ? shortDate.format(new Date(o.dueDate)) : null,
        inStage: inStageLabel(o.stageChangedAt ?? null, now),
        note: o.workshopNote?.trim() || null,
        build: b,
        strip: boardStripText(b?.name ?? null, o.stage),
        next: next
          ? { stage: next, label: stageLabel(next), mails: STAGE_MAIL_STAGES.includes(next) }
          : null,
        checklist: CHECKLIST_ITEMS.map(({ value, label }) => ({
          key: value,
          label,
          done: done.get(value) ?? false,
        })),
        unitCode: obj(o.unit)?.code ?? null,
      },
    ]
  })

  // Open orders from the board, plus the latest shipped ones (with history) for the average.
  const history = (rows: readonly { stage: string; at: string }[] | null | undefined) =>
    (rows ?? []).flatMap((h) => (isOrderStage(h.stage) ? [{ stage: h.stage, at: h.at }] : []))
  const tiles = boardTiles(
    [
      ...orders.docs.filter((o) => o.stage !== 'shipped').map((o) => ({ ...o, stageHistory: [] })),
      ...shipped.docs,
    ].flatMap((o) =>
      isOrderStage(o.stage)
        ? [
            {
              stage: o.stage,
              price: o.price ?? null,
              dueDate: o.dueDate ?? null,
              stageChangedAt: o.stageChangedAt ?? null,
              history: history(o.stageHistory),
            },
          ]
        : [],
    ),
    now,
  )

  const open = cards.filter((c) => c.stage !== 'shipped')
  const firstId = open.find((c) => c.due !== null)?.id ?? open[0]?.id ?? cards[0]?.id ?? null

  return {
    tiles,
    promise: promiseLabel(site.fulfilment),
    columns: BOARD_STAGES.map((stage) => ({
      stage,
      label: stageLabel(stage),
      cards: cards.filter((c) => c.stage === stage),
    })),
    stageEmail: mail.stageEmail !== false,
    firstId,
  }
}
