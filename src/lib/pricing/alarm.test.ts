import { describe, expect, it } from 'vitest'

import expected from '../../../tests/fixtures/pricing-expected.json'
import { firstBatch, firstBatchPublishedAt } from '../../seed/offer'
import { marginAlarmMail } from './alarm'
import type { Catalog } from './catalog'
import { buildQueue, buildsOverview } from './publish'
import { snapshotFromRows } from './snapshot'
import { seedCatalog } from './testing/seedCatalog'

const catalog = seedCatalog()
const snapshot = snapshotFromRows(
  firstBatch().map((row) => ({ ...row, batch: 1, publishedAt: firstBatchPublishedAt() })),
)
const builds = expected.builds.map((b) => ({ slug: b.slug, name: b.name, config: b.config }))
const SCREEN = '/admin/ceny/zatwierdzanie'

function mailFor(c: Catalog) {
  const queue = buildQueue(c, snapshot)
  const rows = buildsOverview(builds, c, snapshot, null)
  return marginAlarmMail(queue.brokenLevels, rows, c.settings.minMargin, SCREEN)
}

describe('margin alarm mail (ADR-G002 §4.4)', () => {
  it('nothing to send while published prices hold the margin', () => {
    expect(mailFor(catalog)).toBeNull()
  })

  it('names the levels, the fix, the builds and the screen when a cost breaks the margin', () => {
    // P13 (Wampir) +500 zł: the published price breaks 11%.
    const dearer: Catalog = {
      ...catalog,
      levels: catalog.levels.map((l) =>
        l.code === 'P13' ? { ...l, partsCost: l.partsCost + 500 } : l,
      ),
    }
    const mail = mailFor(dearer)!
    expect(mail.subject).toBe('PILNE: marża poniżej 11,00% — P13')
    expect(mail.text).toContain('Ceny na stronie się nie zmieniły')
    expect(mail.text).toContain('- Poziom P13:')
    expect(mail.text).toMatch(/Zatwierdź nową cenę poziomu P13 \([\d\s ]+ zł\)/)
    expect(mail.text).toMatch(/- Wampir: 14\s540 zł \/ [\d\s ]+ zł \/ \d+,\d{2}%/)
    expect(mail.text).not.toContain('Skrzat')
    expect(mail.text).toContain('„Do zatwierdzenia” (/admin/ceny/zatwierdzanie)')
  })
})
