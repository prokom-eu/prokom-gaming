import type { AdminViewServerProps } from 'payload'

import { panelAccess } from '../access'
import { Alert } from '../ui/Alert'
import { PanelDenied } from '../ui/PanelDenied'
import { PanelPage } from '../ui/PanelPage'
import { PanelShell } from '../ui/PanelShell'
import { BuildsBoard } from './BuildsBoard'
import { competitorsBySlug } from '../price-reports/load'
import { buildCards, loadBuildsContext } from './load'

const TITLE = 'Gotowe zestawy'
const LEAD =
  '16 przepisów z konfiguratora. Cena każdego zestawu liczy się z jego części, więc zmieniasz przepis albo koszty, nie cenę.'

/**
 * /admin/zestawy — „Gotowe zestawy” (panel spec §9, board Zestawy): 16 cards with price, cost,
 * margin and recipe. „Nowy zestaw” and „Duplikuj” are not in v1 (a new creature needs graphics
 * and tokens — decision 01.11). Admin only: costs and margins.
 */
export async function BuildsView({ initPageResult }: AdminViewServerProps) {
  const { req } = initPageResult
  const access = panelAccess(req, 'admin')
  if (!access.ok) {
    return (
      <PanelDenied req={req} reason={access.reason} title={TITLE} path="/zestawy" active="builds" />
    )
  }
  const admin = req.payload.config.routes.admin
  const [ctx, rivals] = await Promise.all([
    loadBuildsContext(req.payload),
    competitorsBySlug(req.payload),
  ])
  return (
    <PanelShell req={req} title={TITLE} active="builds" crumbs={[{ label: 'Oferta' }]}>
      <div data-builds-screen>
        <PanelPage title={TITLE} lead={LEAD} />
        {'error' in ctx ? (
          <Alert title="Nie można policzyć zestawów">{ctx.error}</Alert>
        ) : (
          <BuildsBoard
            cards={buildCards(ctx)}
            minMargin={ctx.offer.catalog.settings.minMargin}
            warnMargin={ctx.warnMargin}
            editBase={`${admin}/zestawy`}
            competitors={Object.fromEntries(
              [...rivals].map(([slug, c]) => [slug, { name: c.name, price: c.price }]),
            )}
          />
        )}
      </div>
    </PanelShell>
  )
}
