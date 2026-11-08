/**
 * Build page `/zestawy/[slug]` (spec. §6, board Zestaw). Browser-safe: public labels, sell prices
 * and stored FPS only (ADR-G002 §8.7). The texts of the interior plan, the monitor rating and the
 * „Dopasuj” rules follow the board's JS 1:1; `lib/buildPage.server.ts` reads the database.
 */
import { checkCompat, indexOffer, resolveParts } from './compat'
import { fpsFor, RESOLUTION_LABELS, RESOLUTIONS, type FpsTable, type Resolution } from './fps'
import type { HeroBuild } from './home'
import { priceFromSnapshot, surcharge, type PriceList } from './pricing/snapshot'
import { LIGHT_COLOR_CHOICES, type LightColor } from './inquiry/types'
import type { CompatLevel, CompatOption, Config } from './pricing/types'

// ---------------------------------------------------------------------------------------------
// „Na jaki monitor” (board Zestaw `mon`): the average of four heavy games at each resolution.
// ---------------------------------------------------------------------------------------------

export const MONITOR_GAMES = [
  'cyberpunk-2077',
  'black-myth-wukong',
  'assassins-creed-shadows',
  'wiedzmin-3',
] as const

export type MonitorFit = {
  resolution: Resolution
  label: string
  verdict: 'bez kompromisów' | 'płynnie' | 'da radę' | 'nie polecamy'
  /** ≥ 60 FPS: drawn as a recommended tile. */
  ok: boolean
}

/**
 * One tile per resolution. The board counts a missing number as 0; here a resolution without all
 * four numbers gets no tile — a verdict must come from data (ADR-G004), not from a gap.
 */
export function monitorFit(table: FpsTable, build: string): MonitorFit[] {
  const fits: MonitorFit[] = []
  for (const resolution of RESOLUTIONS) {
    const numbers = MONITOR_GAMES.map((game) => fpsFor(table, build, game, resolution)?.fps)
    if (numbers.some((n) => n === undefined)) continue
    const avg = (numbers as number[]).reduce((a, b) => a + b, 0) / numbers.length
    const verdict =
      avg >= 90 ? 'bez kompromisów' : avg >= 60 ? 'płynnie' : avg >= 45 ? 'da radę' : 'nie polecamy'
    fits.push({ resolution, label: RESOLUTION_LABELS[resolution], verdict, ok: avg >= 60 })
  }
  return fits
}

/** The 12 games of „Ile klatek w Twojej grze” in board order (`KG`). */
export const BUILD_PAGE_GAMES = [
  'counter-strike-2',
  'fortnite',
  'valorant',
  'league-of-legends',
  'minecraft',
  'ea-sports-fc-27',
  'gta-v',
  'cyberpunk-2077',
  'wiedzmin-3',
  'red-dead-redemption-2',
  'the-blood-of-dawnwalker',
  'black-myth-wukong',
] as const

// ---------------------------------------------------------------------------------------------
// „Co jest w środku” (board Zestaw `PD`): eight parts, texts 1:1.
// ---------------------------------------------------------------------------------------------

export type InteriorInput = {
  cpu: string
  gpu: string
  motherboard: string
  psu: string
  ram: string
  ssd: string
  cooler: string
  coolerKind: 'air' | 'aio360'
  case: string
  /** `power-levels.platform`: AM4, AM5, LGA1700, LGA1851. */
  platform: string
  resolution: Resolution
}

export type InteriorPart = {
  /** „Karta graficzna” … „Obudowa i wentylatory”. */
  title: string
  /** Class of the part (public label); case and cooler by full name (ADR-G002 §8.7). */
  value: string
  /** First sentence of `why` — the tile under the plan. */
  short: string
  why: string
  minimum: string
}

const firstSentence = (text: string) => `${text.split('. ')[0]!.replace(/\.+$/, '')}.`

export function interiorParts(p: InteriorInput): InteriorPart[] {
  const x3d = /X3D/.test(p.cpu)
  const intel = p.platform.startsWith('LGA')
  const am4 = p.platform === 'AM4'
  const air = p.coolerKind === 'air'
  const vram = p.gpu.match(/(\d+) GB/)?.[1]
  const vramText = vram ?? '?'
  const parts: [string, string, string, string][] = [
    [
      'Karta graficzna',
      p.gpu,
      `${vramText} GB pamięci karty. Najważniejsza część dla klatek: to ona rysuje każdą scenę na monitorze ${RESOLUTION_LABELS[p.resolution]}.`,
      `karta nowej generacji z min. ${vramText} GB pamięci, chłodzenie z dwoma albo trzema wentylatorami`,
    ],
    [
      'Procesor',
      p.cpu,
      x3d
        ? 'Wersja X3D ma dodatkową pamięć podręczną 3D V-Cache. W grach to często kilkanaście procent klatek więcej przy tej samej karcie.'
        : intel
          ? 'Dużo rdzeni na montaż, stream i granie naraz. Dobry wybór, gdy komputer ma też pracować.'
          : 'Nowoczesny procesor, który nie zatrzyma karty graficznej w grach w tej klasie.',
      am4
        ? 'platforma AM4, sprawdzona i tania w rozbudowie'
        : intel
          ? 'platforma Intel z aktualnym chipsetem'
          : 'platforma AM5: w przyszłości wymienisz sam procesor',
    ],
    [
      'Chłodzenie',
      p.cooler,
      air
        ? 'Duże chłodzenie wieżowe. Ciche przy zwykłej pracy, wystarczające przy pełnym obciążeniu tej klasy procesora.'
        : 'Chłodzenie wodne AIO: niższe temperatury i ciszej pod obciążeniem, a w środku zostaje więcej miejsca.',
      air ? 'radiator wieżowy z min. 4 ciepłowodami' : 'AIO 360 mm od sprawdzonego producenta',
    ],
    [
      'Pamięć RAM',
      p.ram,
      'Dwie kości w trybie dwukanałowym, z włączonym profilem szybkości. Gra, Discord i przeglądarka naraz bez przycinek.',
      'tryb dwukanałowy, profil EXPO lub XMP włączony',
    ],
    [
      'Dysk',
      p.ssd,
      'Szybki dysk M.2: gry wczytują się w kilka sekund, a Windows startuje, zanim zdążysz usiąść.',
      'NVMe PCIe 4.0, odczyt min. 5000 MB/s',
    ],
    [
      'Płyta główna',
      p.motherboard,
      'Łączy wszystko i decyduje o rozbudowie: wolne gniazda na pamięć i dyski, Wi-Fi i Bluetooth na pokładzie.',
      'Wi-Fi i Bluetooth, min. 2 gniazda M.2',
    ],
    [
      'Zasilacz',
      p.psu,
      'Dobrany z zapasem: przy grze nie pracuje na granicy, a za rok uniesie mocniejszą kartę.',
      'certyfikat 80+ Bronze lub wyższy, standard ATX 3.1, zabezpieczenia OVP, OCP i SCP',
    ],
    [
      'Obudowa i wentylatory',
      p.case,
      'Szkło z boku, kable schowane za płytą, przepływ powietrza od frontu do tyłu. Światło zmienisz przyciskiem.',
      'min. 3 wentylatory z podświetleniem, filtr kurzu',
    ],
  ]
  return parts.map(([title, value, why, minimum]) => ({
    title,
    value,
    short: firstSentence(why),
    why,
    minimum,
  }))
}

// ---------------------------------------------------------------------------------------------
// „Dopasuj {istotę} pod siebie” (spec. §6 pt 7): RAM, SSD and light; price from the snapshot.
// ---------------------------------------------------------------------------------------------

export type TuneOffer = {
  levels: readonly CompatLevel[]
  /** `active` options only are offered (the configurator's rule). */
  options: readonly (CompatOption & { active: boolean })[]
}

export type TuneChoice = {
  code: string
  /** „32 GB”, „1 TB”, „512 GB”. */
  label: string
  capacityGb: number
  /** Change against the build's own option (0 for it). */
  surcharge: number
  own: boolean
}

const capacityLabel = (gb: number) => (gb >= 1000 ? `${gb / 1000} TB` : `${gb} GB`)

/**
 * RAM or SSD choices for a build: every active option that keeps the configuration valid
 * (`lib/compat.ts`, the same rules `/api/inquiry` checks) and has a published price, one per
 * capacity — the build's own option for its capacity, otherwise the cheapest. By capacity.
 */
export function tuneChoices(
  slot: 'ram' | 'ssd',
  config: Config,
  offer: TuneOffer,
  prices: PriceList,
): TuneChoice[] {
  const index = indexOffer(offer.levels, offer.options)
  const own = index[slot].get(config[slot])
  if (!own) return []
  const best = new Map<number, TuneChoice>()
  for (const option of offer.options) {
    if (option.type !== slot || !option.active) continue
    const parts = resolveParts({ ...config, [slot]: option.code }, index)
    if (!parts || checkCompat(parts).errors.length > 0) continue
    const extra = surcharge(prices, own.code, option.code)
    if (extra === null) continue
    const choice: TuneChoice = {
      code: option.code,
      label: capacityLabel(option.capacityGb),
      capacityGb: option.capacityGb,
      surcharge: extra,
      own: option.code === own.code,
    }
    const current = best.get(option.capacityGb)
    if (!current || choice.own || (!current.own && choice.surcharge < current.surcharge)) {
      best.set(option.capacityGb, choice)
    }
  }
  return [...best.values()].sort((a, b) => a.capacityGb - b.capacityGb)
}

export type LightKey = LightColor

/** Light colours of „Dopasuj” (board `LIGHTS`); the creature's own light is the default. */
export const LIGHTS: readonly { key: LightKey; label: string }[] = LIGHT_COLOR_CHOICES.map(
  ({ value, label }) => ({ key: value, label }),
)

/** „czerwone światło” from `look` = „czarna, czerwone światło” (board `lightDef`). */
export function ownLight(look: string): string {
  return look.split(', ')[1] ?? 'światło istoty'
}

export type Tuned = { ram: string; ssd: string; light: LightKey | null }

/**
 * Price of the tuned version — the same sum as the configurator and the inquiry. The page shows
 * the build price + the choices' surcharges (`TuneBuild`); the tests check that both are equal for
 * every choice of all 16 builds, so this is the reference, not dead code.
 */
export function tunedPrice(config: Config, tuned: Tuned, prices: PriceList): number | null {
  return priceFromSnapshot({ ...config, ram: tuned.ram, ssd: tuned.ssd }, prices)
}

/** Line under the price (board `ver.diff`). */
export function tunedNote(diff: number, light: LightKey | null, zl: (v: number) => string): string {
  if (diff !== 0) {
    const sign = diff > 0 ? `+${zl(diff)}` : `−${zl(-diff)}`
    return `Różnica ${sign} względem zestawu. Liczymy tak samo jak konfigurator.`
  }
  return light ? 'Kolor światła bez dopłaty.' : 'Wersja jak na zdjęciu.'
}

/**
 * „Zapytaj o tę wersję” → `/zapytanie?zestaw=wampir&ram=R64&ssd=NM2&swiatlo=lod`, only what
 * differs from the build. The form saves the light colour as `lightColor` (ADR-G005, 30.10.2026).
 */
export function inquiryHref(slug: string, config: Config, tuned?: Tuned): string {
  const params = new URLSearchParams({ zestaw: slug })
  if (tuned && tuned.ram !== config.ram) params.set('ram', tuned.ram)
  if (tuned && tuned.ssd !== config.ssd) params.set('ssd', tuned.ssd)
  if (tuned?.light) params.set('swiatlo', tuned.light)
  return `/zapytanie?${params.toString()}`
}

// ---------------------------------------------------------------------------------------------
// Neighbours and the creature switcher.
// ---------------------------------------------------------------------------------------------

/**
 * „Inne istoty w pobliżu” (board `same`): the same tier or one up, in level order, at most three.
 * The top tier has nothing above: it shows the tier below.
 */
export function neighbours(builds: readonly HeroBuild[], slug: string, max = 3): HeroBuild[] {
  const current = builds.find((b) => b.slug === slug)
  if (!current) return []
  const others = builds.filter((b) => b.slug !== slug)
  const near = others.filter((b) => b.tier === current.tier || b.tier === current.tier + 1)
  const list = near.length > 0 ? near : others.filter((b) => b.tier === current.tier - 1)
  return list.slice(0, max)
}

/** Previous / next creature in level order, wrapping around (board: „13 z 16 istot”). */
export function prevNext(builds: readonly HeroBuild[], slug: string) {
  const i = builds.findIndex((b) => b.slug === slug)
  if (i < 0) return null
  const n = builds.length
  return { position: i + 1, total: n, prev: builds[(i - 1 + n) % n]!, next: builds[(i + 1) % n]! }
}

/** Identifier of the build for the GPSR block (board `bp.code`, e.g. „WAM-7”). */
export function buildCode(key: string, tier: number): string {
  return `${key.slice(0, 3).toUpperCase()}-${tier}`
}

// ---------------------------------------------------------------------------------------------
// Structured data (spec. §6): Product + Offer, BreadcrumbList, FAQPage.
// ---------------------------------------------------------------------------------------------

const DAY_MS = 24 * 60 * 60 * 1000

export function buildJsonLd(input: {
  siteUrl: string
  slug: string
  name: string
  description: string
  image: string | null
  price: number | null
  /** ISO date-time of the price batch. */
  pricedAt: string | null
  faq: readonly { question: string; answer: string }[]
}): object[] {
  const url = (path: string) => new URL(path, input.siteUrl).toString()
  const page = url(`/zestawy/${input.slug}`)
  const product: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: `Komputer do gier ${input.name}`,
    description: input.description,
    brand: { '@type': 'Brand', name: 'PRO-KOM Gaming' },
    url: page,
    ...(input.image ? { image: url(input.image) } : {}),
  }
  if (input.price !== null && input.pricedAt) {
    product.offers = {
      '@type': 'Offer',
      price: input.price,
      priceCurrency: 'PLN',
      // Spec. §6: the price date + 7 days.
      priceValidUntil: new Date(Date.parse(input.pricedAt) + 7 * DAY_MS).toISOString().slice(0, 10),
      availability: 'https://schema.org/MadeToOrder',
      url: page,
      seller: { '@type': 'Organization', name: 'PRO-KOM' },
    }
  }
  const breadcrumbs = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Strona główna', item: url('/') },
      { '@type': 'ListItem', position: 2, name: 'Zestawy', item: url('/zestawy') },
      { '@type': 'ListItem', position: 3, name: input.name, item: page },
    ],
  }
  const list: object[] = [product, breadcrumbs]
  if (input.faq.length > 0) {
    list.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: input.faq.map((q) => ({
        '@type': 'Question',
        name: q.question,
        acceptedAnswer: { '@type': 'Answer', text: q.answer },
      })),
    })
  }
  return list
}
