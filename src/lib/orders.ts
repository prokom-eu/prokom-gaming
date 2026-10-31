// Orders and their stages (ADR-G005, panel spec §7). Pure — shared by the collection, the
// workshop strip on the home page, the account and the certificate pages.

/** Prefix of the order number (`Z-2026-0007`, panel spec §7). */
export const ORDER_NUMBER_PREFIX = 'Z'

/**
 * Stages in order (ADR-G005). Each one is what is happening *now*: `offer` = offer accepted,
 * waiting for the payment; `metric_ready` = certificate done, before shipping.
 */
export const ORDER_STAGES = [
  'offer',
  'paid',
  'parts',
  'assembly',
  'test',
  'metric_ready',
  'shipped',
  'delivered',
] as const
export type OrderStage = (typeof ORDER_STAGES)[number]

/** Panel labels: the 7 columns of the workshop board (panel spec §7) plus the final state. */
export const ORDER_STAGE_CHOICES: readonly { value: OrderStage; label: string }[] = [
  { value: 'offer', label: 'Oferta przyjęta' },
  { value: 'paid', label: 'Opłacone' },
  { value: 'parts', label: 'Części' },
  { value: 'assembly', label: 'Montaż' },
  { value: 'test', label: 'Testy' },
  { value: 'metric_ready', label: 'Metryka' },
  { value: 'shipped', label: 'Wysłane' },
  // TODO(krystian): label of the final state — not a column on the panel board.
  { value: 'delivered', label: 'U klienta' },
]

export function isOrderStage(value: unknown): value is OrderStage {
  return typeof value === 'string' && (ORDER_STAGES as readonly string[]).includes(value)
}

export function formatOrderNumber(year: number, seq: number): string {
  if (!Number.isInteger(seq) || seq < 1) throw new Error(`Invalid order sequence: ${seq}`)
  return `${ORDER_NUMBER_PREFIX}-${year}-${String(seq).padStart(4, '0')}`
}

/** The customer's timeline (boards Konto and Metryka): 8 steps, from the inquiry to delivery. */
export const TIMELINE_STEPS = [
  'Zapytanie',
  'Oferta',
  'Wpłata',
  'Części',
  'Montaż',
  'Test i pomiary',
  'Wysłany',
  'U Ciebie',
] as const

/** Index in `TIMELINE_STEPS` of the step happening now; every earlier step is done. */
const TIMELINE_NOW: Record<OrderStage, number> = {
  offer: 2, // offer accepted → waiting for the payment
  paid: 3, // paid → parts come next
  parts: 3,
  assembly: 4,
  test: 5,
  metric_ready: 5, // tests and certificate are one step for the customer
  shipped: 6,
  delivered: 7,
}

export type TimelineStep = { label: string; state: 'done' | 'now' | 'todo' }

/** Delivered = every step done (nothing is "now" any more). */
export function timeline(stage: OrderStage): TimelineStep[] {
  const now = TIMELINE_NOW[stage]
  const allDone = stage === 'delivered'
  return TIMELINE_STEPS.map((label, i) => ({
    label,
    state: allDone || i < now ? 'done' : i === now ? 'now' : 'todo',
  }))
}

/**
 * "Teraz: …" under the timeline in the account (board Konto). The board shows only the test stage;
 * TODO(krystian): the other sentences are drafts.
 */
export const CUSTOMER_STAGE_TEXT: Record<OrderStage, string> = {
  offer: 'czekamy na wpłatę według faktury pro forma.',
  paid: 'wpłata zaksięgowana, kompletujemy części.',
  parts: 'kompletujemy części.',
  assembly: 'montaż i układanie kabli.',
  test: 'test obciążeniowy i pomiary w grach.',
  metric_ready: 'metryka gotowa, szykujemy wysyłkę.',
  shipped: 'komputer jest w drodze do Ciebie.',
  delivered: 'komputer jest u Ciebie. Miłego grania!',
}

/**
 * What the workshop strip on the home page says (board Main, `.tk`). Board phrases where they fit;
 * TODO(krystian): `paid` and `shipped` are drafts.
 */
export const WORKSHOP_STAGE_TEXT: Partial<Record<OrderStage, string>> = {
  paid: 'czeka na części',
  parts: 'części zamówione',
  assembly: 'montaż i układanie kabli',
  test: 'test obciążeniowy',
  metric_ready: 'metryka gotowa, jutro wysyłka',
  shipped: 'w drodze do klienta',
}

/** Stages shown on the strip: paid and in the workshop, plus recently shipped. */
export const WORKSHOP_STAGES = Object.keys(WORKSHOP_STAGE_TEXT) as OrderStage[]

/** Paid and not shipped yet: the computers physically in the workshop. */
export const IN_WORKSHOP_STAGES: OrderStage[] = [
  'paid',
  'parts',
  'assembly',
  'test',
  'metric_ready',
]

/** A shipped order stays on the strip this long, then drops off even if never marked delivered. */
export const WORKSHOP_SHIPPED_DAYS = 3

/** Most items on the strip. */
export const WORKSHOP_LIMIT = 12

/** One strip item — the only order data that is public (ADR-G005): build name, colour, stage. */
export type WorkshopItem = {
  name: string
  /** Build slug: the creature colour token `--c-<slug>`. */
  slug: string
  /** Creature file key: the sigil. */
  key: string
  stage: OrderStage
  text: string
}

type WorkshopBuild = { name: string; slug: string; key: string }

type WorkshopSource = {
  stage: OrderStage
  stageChangedAt: string | Date | null | undefined
  build: WorkshopBuild | null
}

/** Pure selection of strip items from orders sorted newest first. */
export function workshopItems(orders: readonly WorkshopSource[], now: Date): WorkshopItem[] {
  const shippedSince = now.getTime() - WORKSHOP_SHIPPED_DAYS * 24 * 60 * 60 * 1000
  const items: WorkshopItem[] = []
  for (const order of orders) {
    const text = WORKSHOP_STAGE_TEXT[order.stage]
    if (!text || !order.build) continue
    if (order.stage === 'shipped') {
      const changed = order.stageChangedAt ? new Date(order.stageChangedAt).getTime() : 0
      if (changed < shippedSince) continue
    }
    const { name, slug, key } = order.build
    items.push({ name, slug, key, stage: order.stage, text })
    if (items.length >= WORKSHOP_LIMIT) break
  }
  return items
}

/** Service checklist on an order (panel spec §7): keys and texts 1:1 from the board constant `CK`. */
export const CHECKLIST_ITEMS = [
  { value: 'parts', label: 'Części zgodne z ofertą (numery seryjne wpisane)' },
  { value: 'bios', label: 'BIOS i sterowniki zaktualizowane' },
  { value: 'stress', label: 'Test obciążenia 60 min bez błędów' },
  { value: 'temps', label: 'Temperatury procesora i karty zapisane' },
  { value: 'fps', label: 'Klatki zmierzone w 3 grach klienta' },
  { value: 'photos', label: 'Zdjęcia egzemplarza (przód, wnętrze, w ciemności)' },
  { value: 'certificate', label: 'Metryka i naklejka z kodem QR' },
  { value: 'packed', label: 'Spakowane, list przewozowy albo SMS „do odbioru”' },
] as const
