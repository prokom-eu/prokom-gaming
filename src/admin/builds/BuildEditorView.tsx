import type { AdminViewServerProps } from 'payload'

import { panelAccess } from '../access'
import { Alert } from '../ui/Alert'
import { EmptyState } from '../ui/EmptyState'
import { PanelDenied } from '../ui/PanelDenied'
import { PanelShell } from '../ui/PanelShell'
import { loadEditor } from './editor'
import { EditorBoard } from './EditorBoard'
import { competitorsBySlug } from '../price-reports/load'
import { loadBuildsContext } from './load'

const dateShort = new Intl.DateTimeFormat('pl-PL', {
  timeZone: 'Europe/Warsaw',
  day: '2-digit',
  month: '2-digit',
})

const TITLE = 'Edytor zestawu'
const SLUG = /^[a-z0-9-]{1,80}$/

/** `/admin/zestawy/<slug>` → the slug (Payload's catch-all route gives the segments). */
function slugOf(params: AdminViewServerProps['params']): string | null {
  const segments = params?.segments
  const slug = Array.isArray(segments) ? segments[1] : undefined
  return typeof slug === 'string' && SLUG.test(slug) ? slug : null
}

/**
 * /admin/zestawy/<slug> — the build editor (panel spec §9, board Zestaw, stany/tel-06): status,
 * recipe with incompatible parts greyed out by `lib/compat`, live price and margins from
 * `lib/pricing`, „Zapisz” with the price confirmation. Admin only: costs and margins.
 */
export async function BuildEditorView({ initPageResult, params }: AdminViewServerProps) {
  const { req } = initPageResult
  const slug = slugOf(params)
  const access = panelAccess(req, 'admin')
  if (!access.ok) {
    return (
      <PanelDenied
        req={req}
        reason={access.reason}
        title={TITLE}
        path={slug ? `/zestawy/${slug}` : '/zestawy'}
        active="builds"
      />
    )
  }
  const admin = req.payload.config.routes.admin
  const back = { href: `${admin}/zestawy`, label: 'Gotowe zestawy' }
  const shell = (title: string, children: React.ReactNode) => (
    <PanelShell
      req={req}
      title={title}
      active="builds"
      back={back}
      crumbs={[{ label: 'Gotowe zestawy', href: back.href }]}
    >
      <div data-builds-screen>{children}</div>
    </PanelShell>
  )

  const ctx = await loadBuildsContext(req.payload)
  if ('error' in ctx)
    return shell(TITLE, <Alert title="Nie można policzyć zestawu">{ctx.error}</Alert>)
  const [data, rivals] = await Promise.all([
    slug ? loadEditor(req.payload, ctx, slug) : null,
    competitorsBySlug(req.payload),
  ])
  if (!data) {
    return shell(
      TITLE,
      // TODO(krystian): sentence not on the board.
      <EmptyState title="Nie ma takiego zestawu" icon="tower">
        <a className="pn-link" href={back.href}>
          Wróć do listy zestawów
        </a>
      </EmptyState>,
    )
  }
  const rival = rivals.get(data.build.slug)
  return shell(
    data.build.name,
    <EditorBoard
      data={data}
      competitor={
        rival
          ? {
              name: rival.name,
              price: rival.price,
              date: dateShort.format(new Date(rival.checkedAt)),
            }
          : null
      }
    />,
  )
}
