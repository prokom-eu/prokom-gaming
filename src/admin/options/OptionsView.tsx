import type { AdminViewServerProps } from 'payload'

import { panelAccess } from '../access'
import { PanelDenied } from '../ui/PanelDenied'
import { PanelShell } from '../ui/PanelShell'
import { loadOptions } from './load'
import { OptionsBoard } from './OptionsBoard'

const TITLE = 'Opcje konfiguratora'

/**
 * /admin/opcje — „Opcje konfiguratora” (panel spec §10, board Opcje): tabs per kind, the switch
 * „W konfiguratorze”, deleting an unused option and „Dodaj …” with a live price, offer links and
 * a photo. Power levels as a table only (decision 01.11). Admin only: costs and models.
 */
export async function OptionsView({ initPageResult }: AdminViewServerProps) {
  const { req } = initPageResult
  const access = panelAccess(req, 'admin')
  if (!access.ok) {
    return (
      <PanelDenied req={req} reason={access.reason} title={TITLE} path="/opcje" active="options" />
    )
  }
  const rows = await loadOptions(req.payload)
  return (
    <PanelShell req={req} title={TITLE} active="options" crumbs={[{ label: 'Oferta' }]}>
      <div data-options-screen>
        <OptionsBoard
          rows={rows}
          approveHref={`${req.payload.config.routes.admin}/ceny/zatwierdzanie`}
        />
      </div>
    </PanelShell>
  )
}
