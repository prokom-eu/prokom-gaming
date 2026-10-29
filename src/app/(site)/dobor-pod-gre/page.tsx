import type { Metadata } from 'next'
import Link from 'next/link'
import { connection } from 'next/server'

import { GamePicker } from '@/components/games/GamePicker'
import { getEnv } from '@/lib/env'
import { parsePicker } from '@/lib/games'
import { loadPicker, type PickerData } from '@/lib/games.server'
import { errorFields, log } from '@/lib/logger'
import { routes } from '@/lib/nav'

import '@/components/games/games.css'

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> }

export async function generateMetadata(): Promise<Metadata> {
  // The environment is read per request (the image build has none).
  await connection()
  return {
    title: 'Dobór pod grę — ile klatek da każdy komputer',
    // `?gra=&rozdz=` only make copies of the same page; each game has its own page for search.
    alternates: { canonical: new URL(routes.gamePicker, getEnv().SITE_URL).toString() },
    description:
      'Wybierz grę i monitor. Pokażemy klatki w każdym poziomie mocy, trzy zestawy, które mają sens, i to, skąd pochodzi każdy wynik.',
  }
}

/**
 * „Dobór pod grę” (spec. §8, boards Gra / Gra-telefon). Rendered per request like the rest of the
 * site: offer, prices and FPS come from the database (the image build has none); the server
 * renders the game and resolution of the visitor's link.
 */
export default async function GamePickerPage({ searchParams }: Props) {
  await connection()
  let data: PickerData | null = null
  try {
    data = await loadPicker()
  } catch (error) {
    log.error({ ...errorFields(error) }, 'game picker data failed')
  }

  if (!data) {
    return (
      <header className="gm-head" data-scene-top>
        <div className="wrap">
          <h1 className="h">Dobór pod grę</h1>
          {/* TODO(krystian): text for a database without the offer (not on the board). */}
          <p className="gm-lead">
            Dobór pod grę jest chwilowo niedostępny. Zobacz nasze{' '}
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
      </header>
    )
  }

  const initial = parsePicker(await searchParams, data.games)
  return <GamePicker data={data} initial={initial} />
}
