/**
 * The search index (NAWIGACJA §5.1): builds, games and pages in a small JSON the dialog fetches
 * on first open (`GET /api/szukaj/indeks`). Browser-safe shape: public names, sell prices from
 * the published batch and stored FPS only — never a cost or an internal model (ADR-G002 §8.7).
 */
import type { Features } from '../features'
import { fpsFor, type FpsTable, RESOLUTION_LABELS } from '../fps'
import { SMOOTH_FPS } from '../games'
import type { HeroData } from '../home'
import { routes } from '../nav'

export type SearchBuild = {
  slug: string
  name: string
  /** „Moc VII”. */
  tier: string
  /** „FullHD”, „2K”, „4K” — the level's target resolution. */
  resolution: string
  /** Sell price from the newest published batch; `null` without one. */
  price: number | null
}

export type SearchGame = {
  slug: string
  name: string
  /** Builds with ≥ 60 FPS in FullHD in this game, cheapest first (at most 5) — „Zestawy pod…”. */
  smooth: string[]
}

export type SearchPage = { href: string; title: string; text: string; words?: string }

export type SearchIndex = {
  builds: SearchBuild[]
  games: SearchGame[]
  pages: SearchPage[]
}

/** Pages of the site, with words a visitor may type for them (`words`, not shown). */
export function searchPages(flags: Features): SearchPage[] {
  const pages: SearchPage[] = [
    { href: routes.builds, title: 'Wszystkie zestawy', text: '16 istot z cenami i klatkami' },
    { href: routes.configurator, title: 'Konfigurator', text: 'Złóż komputer pod siebie' },
    {
      href: routes.gamePicker,
      title: 'Dobór pod grę',
      text: 'Wybierz grę, a pokażemy zestawy',
      words: 'gra gry dobierz',
    },
    { href: routes.compare, title: 'Porównaj', text: 'Do trzech istot obok siebie' },
    {
      href: routes.parents,
      title: 'Dla rodziców',
      text: 'Komputer dla dziecka bez żargonu',
      words: 'dziecko dziecka syn syna corka corki rodzic prezent',
    },
    { href: routes.about, title: 'O nas', text: 'PRO-KOM w Rabce-Zdroju od 2004 roku' },
    {
      href: routes.contact,
      title: 'Kontakt',
      text: 'Telefon, e-mail i sklep',
      words: 'telefon mail adres sklep',
    },
    { href: routes.inquiry, title: 'Zapytanie o komputer', text: 'Oferta z ceną i terminem' },
    { href: routes.faq, title: 'Pytania i odpowiedzi', text: 'Gwarancja, płatność, wysyłka' },
    { href: routes.guides, title: 'Poradniki', text: 'Jak wybrać komputer do gier' },
    {
      href: routes.certificate,
      title: 'Metryka komputera',
      text: 'Wyniki testów Twojego egzemplarza',
    },
    { href: routes.account, title: 'Moje konto', text: 'Zamówienia i zgłoszenia', words: 'serwis' },
  ]
  if (flags.ready) {
    pages.push({
      href: routes.stock,
      title: 'Gotowe od ręki',
      text: 'Komputery do odbioru od razu',
    })
  }
  if (flags.voucher) {
    pages.push({ href: routes.voucher, title: 'Bon podarunkowy', text: 'Prezent na komputer' })
  }
  return pages
}

/** The index from the offer (`loadPublicOffer`), the games and their stored FPS. */
export function buildSearchIndex(input: {
  hero: HeroData
  games: readonly { slug: string; name: string }[]
  table: FpsTable
  flags: Features
}): SearchIndex {
  const byPrice = [...input.hero.builds].sort(
    (a, b) => (a.price ?? Infinity) - (b.price ?? Infinity),
  )
  return {
    builds: byPrice.map((b) => ({
      slug: b.slug,
      name: b.name,
      tier: `Moc ${b.tierRoman}`,
      resolution: RESOLUTION_LABELS[b.resolution],
      price: b.price,
    })),
    games: input.games.map((g) => ({
      slug: g.slug,
      name: g.name,
      // As „Dobór pod grę” (`pickThree`): priced builds only, by price then power.
      smooth: input.hero.builds
        .filter(
          (b) =>
            b.price !== null &&
            (fpsFor(input.table, b.slug, g.slug, 'fullhd')?.fps ?? 0) >= SMOOTH_FPS,
        )
        .sort((a, b) => a.price! - b.price! || a.tier - b.tier)
        .slice(0, 5)
        .map((b) => b.slug),
    })),
    pages: searchPages(input.flags),
  }
}
