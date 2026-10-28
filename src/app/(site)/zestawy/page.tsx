import type { Metadata } from 'next'
import { connection } from 'next/server'

import { BuildCardView } from '@/components/builds/BuildCardView'
import { BuildsBrowser, type BrowserItem } from '@/components/builds/BuildsBrowser'
import { ButtonLink } from '@/components/ui/Button'
import { buildCards, filtersQuery, parseFilters, type BuildCard } from '@/lib/builds'
import { dateText } from '@/lib/home'
import { errorFields, log } from '@/lib/logger'
import { routes } from '@/lib/nav'
import { loadPublicOffer } from '@/lib/offer.server'

import '@/components/builds/builds.css'

export const metadata: Metadata = { title: 'Wszystkie zestawy' }

/** Cards above the fold on desktop (one row of three): loaded at once. */
const EAGER_CARDS = 3

/** „Wszystkie zestawy” (spec. §5, boards Zestawy / Zestawy-telefon). */
export default async function BuildsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  // Rendered per request like the home page: builds, prices and FPS come from the database, and
  // the image build (`docker build`) has none.
  await connection()
  const filters = parseFilters(await searchParams)

  let cards: BuildCard[] = []
  let pricedAt: string | null = null
  try {
    const offer = await loadPublicOffer()
    cards = buildCards(offer.hero, offer.extras)
    pricedAt = offer.hero.pricedAt
  } catch (error) {
    // A database hiccup must not take the page down: the header and the help box stay.
    log.error({ ...errorFields(error) }, 'builds list data failed')
  }

  const items: BrowserItem[] = cards.map((card, i) => ({
    slug: card.slug,
    facets: card.facets,
    card: <BuildCardView card={card} eager={i < EAGER_CARDS} />,
  }))

  return (
    <>
      {/* Background from CSS only (board: a faint forest at 55%): an image here was the LCP
          element and cost ~0.6 s on a phone (Lighthouse, G9). */}
      <header className="bl-head" data-scene-top>
        <div className="wrap bl-head__in">
          <h1 className="h">Wszystkie zestawy</h1>
          <p className="bl-lead">
            Szesnaście komputerów w dziewięciu poziomach mocy, od Skrzata do Peruna.
            {pricedAt && ` Ceny z ${dateText(pricedAt)}, z Windows i wysyłką.`} Każdy złożymy,
            przetestujemy i zmierzymy w grach, zanim do Ciebie wyjedzie. Nie wiesz, który wybrać?
            Zacznij od monitora.
          </p>
        </div>
      </header>

      <section className="bl-list" aria-label="Zestawy">
        {/* `key`: a soft navigation to other filters (e.g. „Zestawy” in the tab bar from
            `?monitor=2k`) brings new `initial` — remount, so the list follows the address. */}
        {items.length > 0 && (
          <BuildsBrowser key={filtersQuery(filters)} items={items} initial={filters} />
        )}

        <div className="wrap">
          <div className="bl-help cut">
            <div>
              <h2 className="h">Nadal nie wiesz, który?</h2>
              <p>
                Napisz, w co grasz i na jakim monitorze. Odpiszemy w godzinę z jedną, konkretną
                propozycją.
              </p>
            </div>
            <div className="bl-help__cta">
              <ButtonLink href={routes.configurator}>Dobierz w konfiguratorze</ButtonLink>
              <ButtonLink href={routes.inquiry} variant="ghost">
                Zapytaj człowieka
              </ButtonLink>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
