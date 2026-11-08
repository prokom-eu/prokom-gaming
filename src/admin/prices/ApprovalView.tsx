import type { AdminViewServerProps } from 'payload'

import { percentShort } from '../../lib/pricing/format'
import { configLabel, previewPublication } from '../../lib/pricing/preview'
import { panelAccess } from '../access'
import { Alert } from '../ui/Alert'
import { PanelDenied } from '../ui/PanelDenied'
import { PanelPage } from '../ui/PanelPage'
import { PanelShell } from '../ui/PanelShell'
import { ApprovalBoard, type ApprovalRow } from './ApprovalBoard'
import { CATEGORY_LABEL, loadPrices } from './load'

const TITLE = 'Do zatwierdzenia'
const LEAD =
  'Zaznacz, co publikujesz. Strażnik sprawdza każdą zgodną konfigurację konfiguratora, zanim cokolwiek trafi na stronę.'

const dateShort = new Intl.DateTimeFormat('pl-PL', {
  timeZone: 'Europe/Warsaw',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

/**
 * /admin/ceny/zatwierdzanie — „Do zatwierdzenia” (panel spec §8, board Publikacja, stany/tel-05):
 * the queue of `buildQueue()` with checkboxes, the live guard (`planPublication()` for every
 * selection), „Co zobaczy klient” and the batch history. Publishing is the G4 action. Admin only.
 */
export async function ApprovalView({ initPageResult }: AdminViewServerProps) {
  const { req } = initPageResult
  const access = panelAccess(req, 'admin')
  if (!access.ok) {
    return (
      <PanelDenied
        req={req}
        reason={access.reason}
        title={TITLE}
        path="/ceny/zatwierdzanie"
        active="approve"
      />
    )
  }
  const admin = req.payload.config.routes.admin
  const shell = (lead: string, children: React.ReactNode) => (
    <PanelShell req={req} title={TITLE} active="approve" crumbs={[{ label: 'Ceny' }]}>
      {/* data-prices-screen: the e2e accessibility check scans this screen only. */}
      <div data-prices-screen>
        <PanelPage title={TITLE} lead={lead} />
        {children}
      </div>
    </PanelShell>
  )

  const data = await loadPrices(req.payload)
  if ('error' in data) {
    return shell(LEAD, <Alert title="Nie można policzyć kolejki">{data.error}</Alert>)
  }

  const { queue, items, current, offer, batches } = data
  const { minMargin, publishThreshold } = offer.catalog.settings
  const info = new Map(items.map((i) => [i.key as string, i]))
  const rows: ApprovalRow[] = queue.items.map((q) => {
    const item = info.get(q.key)
    return {
      key: q.key,
      title: item?.title ?? q.itemCode,
      category: item ? CATEGORY_LABEL[item.category] : q.itemType,
      reason: q.reasons.includes('urgent')
        ? 'pilne — obecna cena łamie marżę'
        : q.reasons.includes('new')
          ? 'nowa pozycja'
          : `powyżej progu ${percentShort(publishThreshold)}`,
      isNew: q.reasons.includes('new'),
      published: q.published,
      candidate: q.candidate,
      change: q.change,
      builds: item?.builds ?? [],
    }
  })
  const keys = rows.map((r) => r.key)
  const initial = previewPublication(offer.catalog, current.snapshot, offer.builds, keys)
  // TODO(krystian): the board says „Zmiany cen z raportu z <data>” — reports come with P7.
  const lead = `Zmiany cen od partii #${current.snapshot.batch} z ${dateShort.format(new Date(current.snapshot.publishedAt))}. ${LEAD}`

  return shell(
    lead,
    <ApprovalBoard
      rows={rows}
      minorChanges={queue.minorChanges}
      minMargin={minMargin}
      initial={{
        ok: true,
        canPublish: initial.ok,
        messages: initial.messages,
        count: initial.count,
        compatible: initial.compatible,
        lowest: initial.lowest
          ? { margin: initial.lowest.margin, config: configLabel(initial.lowest.config) }
          : null,
        client: initial.client,
      }}
      batches={batches.map((b) => ({
        batch: b.batch,
        date: dateShort.format(new Date(b.publishedAt)),
        by: b.by,
      }))}
      centreHref={`${admin}/ceny`}
    />,
  )
}
