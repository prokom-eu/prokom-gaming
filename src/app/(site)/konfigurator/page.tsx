import type { Metadata } from 'next'
import Link from 'next/link'
import { connection } from 'next/server'

import { Configurator } from '@/components/configurator/Configurator'
import { parseState, stateQuery } from '@/lib/configurator'
import { loadConfigurator } from '@/lib/configurator.server'
import { getEnv } from '@/lib/env'
import { routes } from '@/lib/nav'

import '@/components/configurator/configurator.css'

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> }

export const metadata: Metadata = {
  title: 'Konfigurator — złóż swój komputer do gier',
  // One address for search engines: the state parameters only make copies of the same page.
  alternates: { canonical: '/konfigurator' },
  description:
    'Wybierz moc, wygląd i pamięć. Cena przelicza się przy każdym kliknięciu i jest dokładnie taka, jak w naszych gotowych zestawach.',
}

/** The first value of each parameter, as `URLSearchParams` (what `parseState` reads). */
function toParams(raw: Record<string, string | string[] | undefined>): URLSearchParams {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(raw)) {
    const first = Array.isArray(value) ? value[0] : value
    if (first !== undefined) params.set(key, first)
  }
  return params
}

/**
 * Configurator (spec. §7, ADR-G002 §5–§6, boards Konfigurator / Konfigurator-telefon). Rendered per
 * request: the offer, prices and FPS come from the database, and the state from the address — the
 * server renders the same step the visitor's link points to.
 */
export default async function ConfiguratorPage({ searchParams }: Props) {
  await connection()
  const [data, raw] = await Promise.all([loadConfigurator(), searchParams])
  const parsed = data.prices
    ? parseState(toParams(raw), {
        offer: data,
        builds: data.builds,
        prices: data.prices,
        games: data.games.map((g) => g.slug),
      })
    : null

  if (!data.prices || !parsed) {
    return (
      <section className="cf cf--empty">
        <div className="wrap">
          <h1 className="h">Złóż swój komputer</h1>
          {/* TODO(krystian): text for a database without published prices (not on the board). */}
          <p className="cf-lead">
            Konfigurator jest chwilowo niedostępny. Zobacz nasze{' '}
            <Link className="lnk" href={routes.builds}>
              gotowe zestawy
            </Link>{' '}
            albo{' '}
            <Link className="lnk" href={routes.contact}>
              napisz do nas
            </Link>
            .
          </p>
        </div>
      </section>
    )
  }

  return (
    <Configurator
      // A new address from the server (a restored configuration) starts a fresh state.
      key={stateQuery(parsed.state)}
      data={{ ...data, prices: data.prices }}
      initial={parsed.state}
      initialChanges={parsed.changes}
      // Any parameter is a link someone followed: it wins over the stored configuration.
      fromAddress={Object.keys(raw).length > 0}
      siteUrl={getEnv().SITE_URL}
    />
  )
}
