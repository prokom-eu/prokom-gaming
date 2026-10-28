import type { Metadata } from 'next'
import Link from 'next/link'
import { connection } from 'next/server'

import { Compare } from '@/components/compare/Compare'
import { compareQuery, parseCompare, type CompareData } from '@/lib/compare'
import { loadCompare } from '@/lib/compare.server'
import { getEnv } from '@/lib/env'
import { errorFields, log } from '@/lib/logger'
import { routes } from '@/lib/nav'

import '@/components/compare/compare.css'

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> }

export async function generateMetadata(): Promise<Metadata> {
  // The environment is read per request (the image build has none).
  await connection()
  return {
    title: 'Porównywarka — postaw istoty obok siebie',
    // The state parameters only make copies of the same page.
    alternates: { canonical: new URL(routes.compare, getEnv().SITE_URL).toString() },
    description:
      'Wybierz grę i monitor. Zobaczysz, ile klatek da każdy komputer, czy wykorzysta Twój monitor i co dostajesz za dopłatę.',
  }
}

/**
 * Porównywarka (spec. §9, boards Porownywarka / Porownywarka-telefon). Rendered per request: the
 * offer, prices and FPS come from the database and the state from the address — the server renders
 * exactly the view a sent link points to.
 */
export default async function ComparePage({ searchParams }: Props) {
  await connection()
  let data: CompareData | null = null
  try {
    data = await loadCompare()
  } catch (error) {
    log.error({ ...errorFields(error) }, 'compare data failed')
  }

  return (
    <>
      <header className="cmp-headline" data-scene-top>
        <div className="wrap">
          <h1 className="h">Postaw istoty obok siebie</h1>
          <p className="cmp-lead">
            Wybierz grę i monitor. Zobaczysz, ile klatek da każdy komputer, czy wykorzysta Twój
            monitor i co dostajesz za dopłatę. Porównanie wyślesz rodzicowi albo koledze jednym
            linkiem.
          </p>
          {!data && (
            // TODO(krystian): text for a database without the offer (not on the board).
            <p className="cmp-lead">
              Porównywarka jest chwilowo niedostępna. Zobacz nasze{' '}
              <Link className="lnk" href={routes.builds}>
                gotowe zestawy
              </Link>
              .
            </p>
          )}
        </div>
      </header>
      {data && <CompareFor data={data} params={await searchParams} siteUrl={getEnv().SITE_URL} />}
    </>
  )
}

function CompareFor({
  data,
  params,
  siteUrl,
}: {
  data: CompareData
  params: Record<string, string | string[] | undefined>
  siteUrl: string
}) {
  const initial = parseCompare(params, data)
  // A new address from a soft navigation (e.g. „Porównaj” on another build) starts a fresh state.
  return <Compare key={compareQuery(initial)} data={data} initial={initial} siteUrl={siteUrl} />
}
