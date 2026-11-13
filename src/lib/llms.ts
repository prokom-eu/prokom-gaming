import { RESOLUTION_LABELS, type Resolution } from './fps'
import { routes } from './nav'
import { zl } from './pricing/format'
import { FOUNDED, SITE_NAME } from './seo'
import { company } from './site'

/**
 * `/llms.txt` (llmstxt.org): a plain-text summary of the shop for AI assistants (ChatGPT,
 * Perplexity, Gemini, Claude) — facts they can quote: who we are, where, what we sell, at what
 * price, how buying works. Built from the same data as the pages: prices from the published
 * snapshot only (ADR-G002), no costs, internal models or parts makers of the power tier (ADR-G002
 * §8.7), FPS never promised (ADR-G004), no instalments (decision 25.10.2026).
 *
 * TODO(krystian): the sentences below are a draft from spec. §1 and the board texts (no board for
 * this file) — to accept before production, like every new text.
 */

export type LlmsBuild = {
  slug: string
  name: string
  tierLabel: string
  resolution: Resolution
  price: number | null
}

export type LlmsInput = {
  siteUrl: string
  builds: readonly LlmsBuild[]
  /** ISO date-time of the price batch; `null` without published prices. */
  pricedAt: string | null
  games: readonly { slug: string; name: string }[]
  faq: readonly { question: string; answer: string }[]
}

const dateOf = (iso: string): string => {
  const [y, m, d] = iso.slice(0, 10).split('-')
  return `${d}.${m}.${y}`
}

/** Text of `/llms.txt` — Markdown, as the format asks. */
export function llmsText(input: LlmsInput): string {
  const url = (path: string) => new URL(path, input.siteUrl).toString()
  const priced = input.builds.filter((b) => b.price !== null)
  const lines: string[] = [
    `# ${SITE_NAME}`,
    '',
    `> Komputery do gier (komputery gamingowe) składane na zamówienie i testowane w Rabce-Zdroju na Podhalu, w województwie małopolskim. Sprzedaż w całej Polsce: wysyłka kurierem z ubezpieczeniem w cenie albo odbiór w sklepie w Rabce-Zdroju. Marka firmy ${company.name}, działającej od ${FOUNDED} roku.`,
    '',
    '## Najważniejsze fakty',
    '',
    `- Firma: ${company.name}, ${company.address}, NIP ${company.nip}. Jeden sklep, w Rabce-Zdroju.`,
    `- Kontakt: telefon ${company.phone}, e-mail ${company.email}. Odpowiadamy codziennie 8–22, zwykle w godzinę.`,
    `- Oferta: ${input.builds.length} gotowych zestawów od FullHD do 4K oraz konfigurator z ceną liczoną na żywo.`,
    '- Zakup: zapytanie przez stronę → imienna oferta z listą części, ceną brutto i terminem (ważna 48 godzin) → faktura pro forma → przelew albo BLIK → montaż i test → kurier albo odbiór w sklepie. Bez płatności na stronie i bez pobrania.',
    '- Realizacja: 5–10 dni roboczych od wpłaty.',
    '- Każdy egzemplarz przechodzi test pod obciążeniem i pomiar klatek w grach, a klient dostaje metrykę z wynikami.',
    '- Gwarancja PRO-KOM: 24 miesiące na cały komputer, kurier odbiera komputer na koszt PRO-KOM. Zwrot w ciągu 14 dni, koszt odesłania po stronie klienta.',
    '- Klatki w grach: wyniki z niezależnych testów, przeliczone z testów, szacunki albo zmierzone w PRO-KOM — przy każdej liczbie podajemy źródło. Nie gwarantujemy liczby klatek.',
    '',
  ]
  if (priced.length > 0) {
    lines.push(
      `## Zestawy i ceny${input.pricedAt ? ` (ceny brutto z ${dateOf(input.pricedAt)})` : ''}`,
      '',
      ...priced.map(
        (b) =>
          `- [${b.name}](${url(`${routes.builds}/${b.slug}`)}): ${zl(b.price)}, monitor ${RESOLUTION_LABELS[b.resolution]} (poziom: ${b.tierLabel})`,
      ),
      '',
    )
  }
  lines.push(
    '## Strony',
    '',
    `- [Wszystkie zestawy](${url(routes.builds)}): komputery z ceną i klatkami w grach`,
    `- [Konfigurator](${url(routes.configurator)}): własna konfiguracja z ceną na żywo`,
    `- [Dobór pod grę](${url(routes.gamePicker)}): ile klatek da każdy poziom mocy w wybranej grze`,
    `- [Porównywarka](${url(routes.compare)}): zestawy obok siebie`,
    `- [Dla rodziców](${url(routes.parents)}): komputer do gier dla dziecka krok po kroku`,
    `- [Rabka-Zdrój i Podhale](${url(routes.local)}): sklep, odbiór i dojazd`,
    `- [Pytania i odpowiedzi](${url(routes.faq)})`,
    `- [O nas](${url(routes.about)})`,
    `- [Kontakt](${url(routes.contact)})`,
    '',
  )
  if (input.games.length > 0) {
    lines.push(
      '## Komputer do gry',
      '',
      ...input.games.map((g) => `- [Komputer do ${g.name}](${url(`/komputer-do/${g.slug}`)})`),
      '',
    )
  }
  if (input.faq.length > 0) {
    lines.push(
      '## Pytania i odpowiedzi',
      '',
      ...input.faq.flatMap((q) => [`### ${q.question}`, '', q.answer, '']),
    )
  }
  return `${lines.join('\n').trimEnd()}\n`
}
