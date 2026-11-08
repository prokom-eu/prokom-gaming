import { notFound } from 'next/navigation'
import type { AdminViewServerProps } from 'payload'

import { panelAccess } from '../access'
import { ActionBar } from '../ui/ActionBar'
import { Alert } from '../ui/Alert'
import { Card, Kpi } from '../ui/Card'
import { Chip } from '../ui/Chip'
import { EmptyState } from '../ui/EmptyState'
import { MarginBar } from '../ui/MarginBar'
import { PanelDenied } from '../ui/PanelDenied'
import { PanelPage } from '../ui/PanelPage'
import { PanelShell } from '../ui/PanelShell'
import { Toggle } from '../ui/Toggle'
import { PreviewInteractive } from './PreviewInteractive'

/**
 * /admin/podglad-panelu — every panel component in both modes (open at ≤ 760 px for the phone),
 * for checking the look against the boards and for e2e (tabs, "Więcej", cards). Development only:
 * 404 in production, like /podglad-ui on the site. Sample values, not data (clearly made up).
 */
export async function PanelPreviewView({ initPageResult }: AdminViewServerProps) {
  if (process.env.NODE_ENV === 'production') notFound()
  const { req } = initPageResult
  const access = panelAccess(req, 'staff')
  if (!access.ok) {
    return (
      <PanelDenied
        req={req}
        reason={access.reason}
        title="Podgląd komponentów panelu"
        path="/podglad-panelu"
      />
    )
  }

  return (
    <PanelShell req={req} title="Podgląd komponentów" crumbs={[{ label: 'System' }]}>
      <PanelPage
        title="Podgląd komponentów"
        lead="Tylko w trybie deweloperskim. Wartości przykładowe — nie pochodzą z bazy."
        actions={
          <>
            <button type="button" className="pn-btn">
              Zwykły
            </button>
            <button type="button" className="pn-btn pn-btn--gold">
              Złoty
            </button>
            <button type="button" className="pn-btn" disabled>
              Wyłączony
            </button>
          </>
        }
      />

      <div className="pn-grid pn-g4">
        <Kpi
          label="Zapytania dziś"
          value="3"
          note="+1 wobec wczoraj · 2 czekają"
          spark={[1, 2, 2, 1, 0, 2, 3, 3, 2, 3]}
        />
        <Kpi
          label="Odwiedzający dziś"
          value="197"
          note="30 dni: 6 775"
          spark={[150, 160, 140, 120, 170, 210, 197]}
        />
        <Kpi label="Średnia marża gotowców" value="12,8%" note="było 13,5% przy cenach z 25.10" />
        <Kpi
          label="Najniższa marża w konfiguratorze"
          value="9,2%"
          note="minimum 11%"
          tone="bad"
          spark={[11.1, 11.1, 11.1, 9.2, 9.2]}
        />
      </div>

      <Alert
        title="Marża poniżej 11%"
        actions={
          <button type="button" className="pn-btn pn-btn--gold">
            Zatwierdź 11 cen
          </button>
        }
      >
        Przykład alarmu: najsłabsza konfiguracja 9,2%.
      </Alert>
      <Alert tone="ok" title="Wszystko załatwione" />

      <div className="pn-grid pn-g2">
        <Card title="Statusy" note="kolor i kształt">
          <div className="pn-chips">
            <Chip tone="ok">Na stronie</Chip>
            <Chip tone="warn">11,4%</Chip>
            <Chip tone="bad">9,2%</Chip>
            <Chip tone="info">W toku</Chip>
            <Chip tone="gold">Nowe</Chip>
            <Chip tone="mu">Oferta wysłana</Chip>
          </div>
        </Card>
        <Card title="Marża" note="linia = minimum 11%">
          <div className="pn-grid">
            <MarginBar margin={0.092} minMargin={0.11} warnMargin={0.12} />
            <MarginBar margin={0.114} minMargin={0.11} warnMargin={0.12} />
            <MarginBar margin={0.13} minMargin={0.11} warnMargin={0.12} />
          </div>
        </Card>
        <Card title="Przełączniki">
          <Toggle
            id="pv-alarm"
            label="Alarm: konfiguracja poniżej minimum marży"
            hint="e-mail od razu"
            defaultChecked
          />
          <Toggle
            id="pv-weekly"
            label="Raport tygodniowy w poniedziałek"
            hint="podsumowanie na e-mail"
          />
          <div className="pn-fld" style={{ marginTop: 14 }}>
            <label htmlFor="pv-margin">Minimalna marża komputera</label>
            <input id="pv-margin" inputMode="decimal" defaultValue="11" />
            <small>strażnik blokuje publikację poniżej</small>
          </div>
        </Card>
        <Card title="Pusta lista">
          <EmptyState title="Wszystko załatwione" />
        </Card>
      </div>

      <PreviewInteractive />

      <ActionBar value="11,17%" note="najniższa marża · można publikować" tone="ok">
        <button type="button" className="pn-btn pn-btn--gold">
          Opublikuj 11 cen
        </button>
      </ActionBar>
    </PanelShell>
  )
}
