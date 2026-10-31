import type { AdminViewServerProps, Payload } from 'payload'

import { getEnv } from '../../lib/env'
import { zl } from '../../lib/pricing/format'
import { loadBatch } from '../../lib/pricing/store'
import { panelAccess } from '../access'
import { Card } from '../ui/Card'
import { Icon } from '../ui/icons'
import { PanelDenied } from '../ui/PanelDenied'
import { PanelPage } from '../ui/PanelPage'
import { PanelShell } from '../ui/PanelShell'
import { percentText, toFormValues, type FieldName } from './form'
import { MailSettingsForm } from './MailSettingsForm'
import { toMailFormValues } from './mailForm'
import { SettingsForm } from './SettingsForm'

const TITLE = 'Ustawienia'

/**
 * /admin/ustawienia (panel spec §13, board Ustawienia). Admin only — `serwis` gets "403"
 * (spec §15). Sections: "Marża i narzuty" (`pricing-settings`, P1), "Zapytania i poczta"
 * (`mail-settings`, P3); the others come with their sessions (P4 notifications, P5 orders,
 * P7 price check, P8 statistics).
 */
export async function SettingsView({ initPageResult }: AdminViewServerProps) {
  const { req } = initPageResult
  const access = panelAccess(req, 'admin')
  if (!access.ok) {
    return (
      <PanelDenied
        req={req}
        reason={access.reason}
        title={TITLE}
        path="/ustawienia"
        active="settings"
      />
    )
  }

  const { payload } = req
  const [settings, hints, mail] = await Promise.all([
    payload.findGlobal({ slug: 'pricing-settings', depth: 0, overrideAccess: true }),
    loadHints(payload),
    payload.findGlobal({ slug: 'mail-settings', depth: 0, overrideAccess: true }),
  ])
  const values = toFormValues({
    minMargin: settings.minMargin,
    warnMargin: settings.warnMargin,
    publishThreshold: settings.publishThreshold,
    serviceCost: settings.serviceCost,
    caseCoolerBuffer: settings.caseCoolerBuffer,
    whiteSurcharge: settings.whiteSurcharge,
    roundingStep: settings.roundingStep,
    categoryMarkup: { ram: settings.categoryMarkup.ram, ssd: settings.categoryMarkup.ssd },
    levelMarkupByClass: settings.levelMarkupByClass,
  })
  // One field on the board for RAM and disks; if someone set them apart in the data lists,
  // say so instead of hiding it — changing the field sets both (untouched, both stay).
  if (settings.categoryMarkup.ssd !== settings.categoryMarkup.ram) {
    // TODO(krystian): text — not on the board.
    hints.ramSsd = `uwaga: dyski mają dziś ${percentText(settings.categoryMarkup.ssd)}% — zmiana tego pola ustawi obu tę samą wartość`
  }

  return (
    <PanelShell req={req} title={TITLE} active="settings" crumbs={[{ label: 'System' }]}>
      <PanelPage
        title={TITLE}
        lead="Zasady, według których panel liczy ceny i pilnuje marży. Każda zmiana tutaj przelicza propozycje cen i trafia do zatwierdzenia, nigdy prosto na stronę."
        actions={
          <button type="submit" form="pn-settings" className="pn-btn pn-btn--gold pn-d-only">
            <Icon name="check" size={17} strokeWidth={2} />
            Zapisz zmiany
          </button>
        }
      />
      <div className="pn-settings">
        <Card title="Marża i narzuty" className="pn-card--section">
          <SettingsForm values={values} hints={hints} />
        </Card>
        <Card title="Zapytania i poczta" className="pn-card--section">
          {/* The mailbox is the sender from env (decision 31.10: one Gaming mailbox for all
              mail). Customers' answers by IMAP come in P4 — that row of the board waits. */}
          <dl className="pn-kv">
            <dt>Skrzynka</dt>
            <dd>{getEnv().MAIL_FROM_ADDRESS}</dd>
            <dt>Wysyłka</dt>
            <dd>SMTP skrzynki (Seohost)</dd>
          </dl>
          <div className="pn-manual">
            <Icon name="check" size={20} />
            <div>
              <b>Automatyczne potwierdzenie z numerem</b>
              <small>klient od razu dostaje numer i swoją konfigurację</small>
            </div>
          </div>
          <MailSettingsForm
            values={toMailFormValues({
              replyHours: mail.replyHours,
              replySlaMinutes: mail.replySlaMinutes,
              replyAlarmMinutes: mail.replyAlarmMinutes,
              signature: mail.signature,
            })}
          />
        </Card>
      </div>
    </PanelShell>
  )
}

/**
 * Hints from the data, not from settings: the level markup exception (board: "wyjątek: Skrzat
 * 16,8%") and the service price customers see now ("na stronie: 180 zł").
 */
async function loadHints(payload: Payload): Promise<Partial<Record<FieldName, string>>> {
  const [levels, batch] = await Promise.all([
    payload.find({
      collection: 'power-levels',
      where: { markupOverride: { exists: true } },
      depth: 0,
      pagination: false,
      overrideAccess: true,
      select: { markupOverride: true, markupClass: true, code: true },
    }),
    loadBatch(payload),
  ])
  const overridden = levels.docs.filter((l) => typeof l.markupOverride === 'number')
  const builds = overridden.length
    ? await payload.find({
        collection: 'builds',
        where: { level: { in: overridden.map((l) => l.id) } },
        depth: 0,
        pagination: false,
        overrideAccess: true,
        select: { name: true, level: true },
      })
    : { docs: [] }
  // Under the markup field of the level's class (board: under "Narzut poziomu FullHD").
  const byClass: Partial<Record<FieldName, string[]>> = {}
  for (const l of overridden) {
    const build = builds.docs.find((b) => b.level === l.id)
    const field = l.markupClass as FieldName
    ;(byClass[field] ??= []).push(
      `${build?.name ?? l.code} ${percentText(l.markupOverride as number)}%`,
    )
  }
  return {
    ...Object.fromEntries(
      Object.entries(byClass).map(([field, list]) => [field, `wyjątek: ${list.join(', ')}`]),
    ),
    ...(batch ? { serviceCost: `na stronie: ${zl(batch.snapshot.service)}` } : {}),
  }
}
