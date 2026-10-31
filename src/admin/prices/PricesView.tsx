import { DefaultTemplate } from '@payloadcms/next/templates'
import { Banner, Gutter } from '@payloadcms/ui'
import type { AdminViewServerProps, Payload } from 'payload'

import { isAdmin, isPanelUser } from '../../access/panel'
import { CatalogError } from '../../lib/pricing/catalog'
import { buildQueue, buildsOverview, problemMessage } from '../../lib/pricing/publish'
import { loadBatch, loadOffer, type BatchInfo } from '../../lib/pricing/store'
import { percent, signedZl, zl } from '../../lib/pricing/format'
import styles from './prices.module.css'
import { CostImport } from './CostImport'
import { PricesQueue } from './PricesQueue'

const dateTime = (iso: string) =>
  new Date(iso).toLocaleString('pl-PL', { dateStyle: 'long', timeStyle: 'short' })

// Builds in price order, like on the site (Skrzat … Perun); unpriced ones last.
const byPrice = (a: { price: number | null }, b: { price: number | null }) =>
  (a.price ?? Infinity) - (b.price ?? Infinity)

/**
 * Panel screen "Ceny" at /admin/ceny (ADR-G002 §4): newest batch, margin guard over the prices on
 * the site, the queue to approve and the builds with price, cost and margin. Panel staff only —
 * custom views are public by default, so the check is here.
 */
export async function PricesView({ initPageResult, params, searchParams }: AdminViewServerProps) {
  const { req, locale, permissions, visibleEntities } = initPageResult
  const { payload } = req
  // A message, not `redirect()`: inside Payload's admin page the redirect only reaches the RSC
  // stream and the browser stays on a blank page. Nothing about prices is loaded before this.
  if (!isAdmin(req)) {
    const login = `${payload.config.routes.admin}/login?redirect=${encodeURIComponent(`${payload.config.routes.admin}/ceny`)}`
    return (
      <Gutter className={styles.page}>
        <h1>Ceny — publikacja i marże</h1>
        {isPanelUser(req) ? (
          // Signed in with the `serwis` role: prices and margins are admin-only (panel spec §15).
          <p>Ten ekran jest tylko dla administratora. Twoje konto ma rolę „Serwis”.</p>
        ) : (
          <p>
            Ten ekran jest tylko dla pracowników PRO-KOM. <a href={login}>Zaloguj się do panelu</a>.
          </p>
        )}
      </Gutter>
    )
  }

  const template = (children: React.ReactNode) => (
    <DefaultTemplate
      i18n={req.i18n}
      locale={locale}
      params={params}
      payload={payload}
      permissions={permissions}
      searchParams={searchParams}
      user={req.user ?? undefined}
      visibleEntities={visibleEntities}
    >
      <Gutter className={styles.page}>
        {/* data-prices-screen: the e2e accessibility check scans this screen only. */}
        <div data-prices-screen>
          <h1>Ceny — publikacja i marże</h1>
          {children}
        </div>
      </Gutter>
    </DefaultTemplate>
  )

  const data = await loadScreen(payload)
  if ('error' in data) return template(<Banner type="error">{data.error}</Banner>)

  const { current, queue, builds, minMargin, publishThreshold } = data
  const broken = queue.brokenLevels

  return template(
    <>
      <p className={styles.lead}>
        Partia {current.snapshot.batch} z {dateTime(current.snapshot.publishedAt)}
        {current.publishedBy ? ` · ${current.publishedBy}` : ''}. Marża minimalna{' '}
        {percent(minMargin)}, próg zatwierdzania {percent(publishThreshold)}.
      </p>

      <section className={styles.section} aria-labelledby="guard">
        <h2 id="guard">Strażnik marży — ceny na stronie</h2>
        {broken.length === 0 ? (
          <Banner type="success">
            Wszystkie {queue.publishedReview.compatible.toLocaleString('pl-PL')} zgodnych
            konfiguracji ma marżę co najmniej {percent(minMargin)} (najniższa{' '}
            {percent(queue.publishedReview.minMargin?.margin ?? null)}).
          </Banner>
        ) : (
          <Banner type="error">
            <strong>Pilne: opublikowane ceny przy dzisiejszych kosztach łamią marżę.</strong>
            <ul className={styles.problems}>
              {broken.map((problem) => (
                <li key={problem.level}>{problemMessage(problem, minMargin)}</li>
              ))}
            </ul>
          </Banner>
        )}
      </section>

      <section className={styles.section} aria-labelledby="import">
        <h2 id="import">Import kosztów (CSV)</h2>
        <CostImport />
      </section>

      <section className={styles.section} aria-labelledby="queue">
        <h2 id="queue">Do zatwierdzenia</h2>
        <PricesQueue items={queue.items} />
        {queue.minorChanges > 0 && (
          <p className={styles.hint}>
            {queue.minorChanges} drobnych zmian (poniżej progu {percent(publishThreshold)}) — ceny
            na stronie zostają bez zmian.
          </p>
        )}
      </section>

      <section className={styles.section} aria-labelledby="builds">
        <h2 id="builds">Zestawy</h2>
        <div
          className={styles.tableWrap}
          role="region"
          aria-label="Zestawy: cena, koszt, marża"
          tabIndex={0}
        >
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Zestaw</th>
                <th scope="col">Cena na stronie</th>
                <th scope="col">Koszt dziś</th>
                <th scope="col">Marża</th>
                <th scope="col">Zmiana od partii {current.snapshot.batch - 1 || '—'}</th>
              </tr>
            </thead>
            <tbody>
              {[...builds].sort(byPrice).map((b) => (
                <tr
                  key={b.slug}
                  className={b.margin !== null && b.margin < minMargin ? styles.urgent : undefined}
                >
                  <th scope="row">{b.name}</th>
                  <td>{zl(b.price)}</td>
                  <td>{zl(b.cost)}</td>
                  <td>{percent(b.margin)}</td>
                  <td>{signedZl(b.change)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>,
  )
}

type ScreenData = {
  current: BatchInfo
  queue: ReturnType<typeof buildQueue>
  builds: ReturnType<typeof buildsOverview>
  minMargin: number
  publishThreshold: number
}

/**
 * Everything the screen shows. A data error (missing field, broken batch) becomes a message on
 * the screen instead of an error page.
 */
async function loadScreen(payload: Payload): Promise<ScreenData | { error: string }> {
  try {
    const current = await loadBatch(payload)
    if (!current) return { error: 'Brak opublikowanych cen — uruchom seed.' }
    const offer = await loadOffer(payload)
    const previous =
      current.snapshot.batch > 1 ? await loadBatch(payload, current.snapshot.batch - 1) : null
    return {
      current,
      queue: buildQueue(offer.catalog, current.snapshot),
      builds: buildsOverview(
        offer.builds,
        offer.catalog,
        current.snapshot,
        previous?.snapshot ?? null,
      ),
      minMargin: offer.catalog.settings.minMargin,
      publishThreshold: offer.catalog.settings.publishThreshold,
    }
  } catch (error) {
    if (error instanceof CatalogError) return { error: error.message }
    throw error
  }
}
