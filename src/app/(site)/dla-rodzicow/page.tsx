import type { Metadata } from 'next'
import Link from 'next/link'
import { connection } from 'next/server'

import { BreadcrumbJsonLd } from '@/components/BreadcrumbJsonLd'
import {
  IconBook,
  IconDoc,
  IconGamepad,
  IconMail,
  IconPhone,
  IconQr,
  IconShield,
  IconShop,
  IconTruck,
} from '@/components/icons'
import { JsonLd } from '@/components/JsonLd'
import { ButtonLink } from '@/components/ui/Button'
import { dateText, EMPTY_HERO, type HeroData } from '@/lib/home'
import { errorFields, log } from '@/lib/logger'
import { buildHref, routes } from '@/lib/nav'
import { loadPublicOffer } from '@/lib/offer.server'
import { budgetBands } from '@/lib/parents'
import { zl } from '@/lib/pricing/format'
import { company, registers } from '@/lib/site'

import '@/components/content/content.css'
import '@/components/parents/parents.css'

export const metadata: Metadata = {
  title: 'Komputer dla dziecka',
  description:
    'Komputer do gier dla dziecka bez stresu i bez żargonu: wystarczy powiedzieć, w co dziecko gra. Płacisz po ofercie, przelewem albo BLIK-iem.',
  alternates: { canonical: routes.parents },
}

/** „Opisz, w co gra dziecko”: the inquiry opens on „Pomóżcie mi dobrać”, for a child. */
const ASK = `${routes.inquiry}?tryb=dobor&dla=dziecko`

/** Directions in the visitor's own maps app: a plain link, no map script or cookies. */
const DIRECTIONS = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
  `${company.name}, ${company.address}`,
)}`

const external = { target: '_blank', rel: 'noopener noreferrer' } as const

const STEPS = [
  {
    icon: IconGamepad,
    title: 'Piszesz, w co gra dziecko',
    text: 'Wystarczy nazwa gry, np. Fortnite albo Minecraft, i rodzaj monitora. Nie musisz znać się na częściach.',
  },
  {
    icon: IconMail,
    title: 'Dostajesz ofertę',
    text: 'Imienna lista części, cena i termin, zwykle w ciągu godziny. Oferta jest ważna 48 godzin, możesz ją spokojnie pokazać komuś, kto się zna.',
  },
  {
    icon: IconDoc,
    title: 'Płacisz, gdy jesteś pewien',
    text: 'Faktura pro forma, potem przelew albo BLIK. Bez pobrań i bez zaliczek w ciemno.',
  },
  {
    icon: IconTruck,
    title: 'Odbierasz albo czekasz na kuriera',
    text: 'Komputer przyjeżdża gotowy: z Windowsem, sterownikami i metryką. Albo odbierz go w sklepie w Rabce-Zdroju.',
  },
] as const

/** Six words a parent meets in every offer, each in one sentence (runda v2 §5 pt 5). */
const GLOSSARY = [
  [
    'Karta graficzna',
    'Najważniejsza część do gier: to ona rysuje obraz. Od niej najbardziej zależy, czy gra chodzi płynnie.',
  ],
  [
    'FullHD i 2K',
    'Ostrość obrazu na monitorze. FullHD to najpopularniejsze monitory, 2K jest ostrzejsze i potrzebuje mocniejszego komputera.',
  ],
  [
    'Klatki (FPS)',
    'Ile razy na sekundę zmienia się obraz. Im więcej, tym płynniej; przy każdym zestawie pokazujemy je z testów, nie z obietnic.',
  ],
  [
    'Pamięć RAM',
    'Podręczna pamięć, z której korzystają gra i otwarte programy. Gdy jest jej za mało, gra zaczyna się zacinać.',
  ],
  [
    'Dysk NVMe',
    'Szybki dysk na gry i Windows. Dzięki niemu system i gra wczytują się w kilka sekund.',
  ],
  [
    'Chłodzenie',
    'Wentylatory albo chłodzenie wodne, które odbierają ciepło od części. Dobre chłodzenie to cichszy komputer.',
  ],
] as const

// Questions of the board (not the `faq` collection: the `parents` group there asks other things).
// The only allowed mention of instalments (spec. §27.7): no offer, „Na razie nie…”.
const QUESTIONS = [
  {
    q: 'Czy komputer będzie od razu gotowy do grania?',
    a: 'Tak. Windows 11 jest aktywowany, sterowniki zainstalowane, BIOS aktualny. Podłączasz monitor, klawiaturę i myszkę.',
  },
  {
    q: 'Czy ustawicie kontrolę rodzicielską?',
    a: 'Tak, na życzenie ustawimy konto dziecka w Windows 11 z kontrolą rodzicielską: limity czasu, filtrowanie stron i zgoda na zakupy w grach.',
  },
  {
    q: 'Czy mogę zwrócić komputer?',
    a: 'Tak, przy zakupie na odległość masz 14 dni na odstąpienie od umowy. Koszt odesłania pokrywasz Ty. Szczegóły w regulaminie.',
  },
  {
    q: 'Czy da się kupić na raty?',
    a: 'Na razie nie prowadzimy sprzedaży ratalnej. Płacisz przelewem albo BLIK-iem na podstawie faktury pro forma.',
  },
] as const

/**
 * „Dla rodziców” (spec. §16, runda v2 §5): a light page in seven parts — hero, the four questions
 * of a parent (prices from the published batch), proof the company is real, buying in four steps,
 * a glossary, questions and the closing call. No scene, no gaming ornaments.
 */
export default async function ParentsPage() {
  // Prices come from the database per request (as the other offer pages); without it the page
  // still stands, only the price card says to ask.
  await connection()
  const hero: HeroData = await loadPublicOffer()
    .then((offer) => offer.hero)
    .catch((error: unknown) => {
      log.error({ ...errorFields(error) }, 'parents page offer failed')
      return EMPTY_HERO
    })
  const bands = budgetBands(hero.builds)

  return (
    <>
      <BreadcrumbJsonLd crumbs={[{ name: 'Dla rodziców', path: routes.parents }]} />
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: QUESTIONS.map((item) => ({
            '@type': 'Question',
            name: item.q,
            acceptedAnswer: { '@type': 'Answer', text: item.a },
          })),
        }}
      />

      {/* Light top section: the header floats over it with dark text (globals.css). */}
      <header className="pr-hero" id="start" data-scene-top data-nav-light>
        <div className="wrap pr-hero__grid">
          <div>
            <p className="pr-kicker">Dla rodziców</p>
            <h1 className="h">Komputer dla dziecka bez stresu i bez żargonu</h1>
            <p className="pr-lead">
              Rozumiemy: to duża kwota, a w sklepach wszyscy mówią w obcym języku. U nas wystarczy
              powiedzieć, w co dziecko gra. Resztą zajmiemy się my, a wszystko, co obiecujemy,
              sprawdzisz sam.
            </p>
            <div className="pr-cta">
              <ButtonLink href={ASK} size="lg" className="pr-btn-dark">
                Opisz, w co gra dziecko
              </ButtonLink>
              <a className="btn btn--lg pr-btn-line" href={company.phoneHref}>
                <IconPhone size={18} />
                Zadzwoń: {company.phone}
              </a>
            </div>
          </div>
          <ul className="pr-facts" aria-label="W skrócie">
            <li>
              <b>od 2004</b>
              <span>firma w Rabce-Zdroju</span>
            </li>
            <li>
              <b>48 h</b>
              <span>ważności oferty z listą części</span>
            </li>
            <li>
              <b>24 mies.</b>
              <span>gwarancji z odbiorem od Ciebie</span>
            </li>
          </ul>
        </div>
      </header>

      <section className="pr-sec" id="pytania-rodzica" aria-labelledby="pr-q-h">
        <div className="wrap">
          <h2 id="pr-q-h" className="h">
            Cztery pytania, które zadaje każdy rodzic
          </h2>
          <div className="pr-q">
            <article className="pr-q__card pr-q__card--wide">
              <h3>Ile trzeba wydać?</h3>
              {bands.length > 0 ? (
                <>
                  <p>Zależy od gier i monitora. Najtańsze zestawy, które do nich wystarczą:</p>
                  <ul className="pr-bands">
                    {bands.map((band) => (
                      <li key={band.title}>
                        <span className="pr-bands__what">{band.title}</span>
                        <b className="pr-bands__price">od {zl(band.from)}</b>
                        <span className="pr-bands__picks">
                          {band.picks.map((pick, i) => (
                            <span key={pick.slug}>
                              {i > 0 && ' albo '}
                              <Link
                                className="lnk nm"
                                href={buildHref(pick.slug)}
                                style={{ ['--c' as string]: `var(--c-${pick.slug})` }}
                              >
                                {pick.name}
                              </Link>
                            </span>
                          ))}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <p className="pr-note">
                    Ceny z montażem, Windows 11 i wysyłką
                    {hero.pricedAt ? `, z ${dateText(hero.pricedAt)}` : ''}. Nie wiesz, którą grę
                    wybrać?{' '}
                    <Link className="lnk" href={routes.gamePicker}>
                      Sprawdź konkretną grę
                    </Link>
                    .
                  </p>
                </>
              ) : (
                // TODO(krystian): text when prices are unavailable (not on the board).
                <p>Napisz, w co gra dziecko, a w ofercie podamy dokładną cenę i termin.</p>
              )}
            </article>
            <article className="pr-q__card">
              <h3>Czy to nie za mocny komputer?</h3>
              <p>
                Dobieramy moc do gier, w które dziecko gra, z rozsądnym zapasem na nowe. Jeśli
                wystarczy tańszy zestaw, to go zaproponujemy, a w ofercie napiszemy, dlaczego ten.
              </p>
            </article>
            <article className="pr-q__card">
              <h3>Co jeśli coś się zepsuje?</h3>
              <p>
                Najpierw pomagamy zdalnie. Jeśli trzeba, kurier odbiera komputer od Ciebie na nasz
                koszt. Gwarancja PRO-KOM obejmuje cały komputer przez 2 lata.
              </p>
            </article>
            <article className="pr-q__card">
              <h3>Czy mogę zobaczyć przed zakupem?</h3>
              <p>
                Tak. Sklep jest w Rabce-Zdroju, {company.postal.street}. Przy odbiorze włączymy
                komputer i odpalimy grę przy Tobie.
              </p>
              <a className="lnk" href={DIRECTIONS} {...external}>
                Prowadź do sklepu
              </a>
            </article>
          </div>
        </div>
      </section>

      <section className="pr-sec pr-sec--paper" id="dowody" aria-labelledby="pr-proof-h">
        <div className="wrap">
          <h2 id="pr-proof-h" className="h">
            Sprawdź nas, zanim zapłacisz
          </h2>
          <ul className="pr-proof">
            <li>
              <span className="pr-ico" aria-hidden="true">
                <IconDoc size={22} />
              </span>
              <h3>Prawdziwa firma od 2004 roku</h3>
              <p>
                {company.name}, NIP {company.nip}. Wpisz NIP w publicznym rejestrze i sprawdź nas
                sam.
              </p>
              <p className="pr-links">
                <a className="lnk" href={registers.ceidg} {...external}>
                  Sprawdź w CEIDG
                </a>
                <a className="lnk" href={registers.vatList} {...external}>
                  Sprawdź na białej liście VAT
                </a>
              </p>
            </li>
            <li>
              <span className="pr-ico" aria-hidden="true">
                <IconShop size={22} />
              </span>
              <h3>Sklep, do którego możesz przyjechać</h3>
              <p>{company.address}.</p>
              <p className="pr-links">
                <a className="lnk" href={DIRECTIONS} {...external}>
                  Prowadź do sklepu
                </a>
              </p>
            </li>
            <li>
              <span className="pr-ico" aria-hidden="true">
                <IconShield size={22} />
              </span>
              <h3>Gwarancja 24 miesiące z odbiorem</h3>
              <p>
                Na cały komputer. Gdy coś nie działa, kurier odbiera go od Ciebie na nasz koszt.
              </p>
            </li>
            <li>
              <span className="pr-ico" aria-hidden="true">
                <IconQr size={22} />
              </span>
              <h3>Metryka każdego egzemplarza</h3>
              <p>Wyniki testów i numery części na piśmie, w pudełku i online pod kodem QR.</p>
              <p className="pr-links">
                <Link className="lnk" href="/#metryka">
                  Zobacz, co jest w metryce
                </Link>
              </p>
            </li>
          </ul>
        </div>
      </section>

      <section className="pr-sec" id="zakup" aria-labelledby="pr-steps-h">
        <div className="wrap">
          <h2 id="pr-steps-h" className="h">
            Jak wygląda zakup
          </h2>
          <ol className="pr-steps">
            {STEPS.map(({ icon: Icon, title, text }) => (
              <li key={title}>
                <span className="pr-ico" aria-hidden="true">
                  <Icon size={22} />
                </span>
                <h3>{title}</h3>
                <p>{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="pr-sec pr-sec--paper" id="slowniczek" aria-labelledby="pr-words-h">
        <div className="wrap pr-words">
          <div>
            <h2 id="pr-words-h" className="h">
              Słowniczek dla rodzica
            </h2>
            <p className="pr-lead pr-lead--small">
              Sześć słów, które padają w każdej ofercie. Po jednym zdaniu, bez żargonu.
            </p>
          </div>
          <dl>
            {GLOSSARY.map(([term, text]) => (
              <div key={term}>
                <dt>{term}</dt>
                <dd>{text}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="pr-sec" id="pytania" aria-labelledby="pr-faq-h">
        <div className="wrap pr-faq">
          <h2 id="pr-faq-h" className="h">
            Pytania rodziców
          </h2>
          <div>
            {QUESTIONS.map((item, i) => (
              <details key={item.q} className="ct-qa pr-qa" open={i === 0}>
                <summary>
                  {item.q}
                  <i aria-hidden="true" />
                </summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="pr-final" id="napisz" aria-labelledby="pr-final-h">
        <div className="wrap pr-final__in">
          <h2 id="pr-final-h" className="h">
            Napisz, w co gra dziecko
          </h2>
          <p className="pr-lead">
            Odpiszemy z imienną listą części, ceną i terminem, zwykle w ciągu godziny, codziennie od
            8 do 22. Zapytanie nic nie kosztuje i do niczego nie zobowiązuje.
          </p>
          <div className="pr-cta pr-cta--center">
            <ButtonLink href={ASK} size="lg" className="pr-btn-dark">
              Opisz, w co gra dziecko
            </ButtonLink>
            <a className="btn btn--lg pr-btn-line" href={company.phoneHref}>
              <IconPhone size={18} />
              Zadzwoń: {company.phone}
            </a>
          </div>
          <p className="pr-note">
            <IconBook size={16} />{' '}
            <Link className="lnk" href="/poradniki/rodzice">
              Przeczytaj poradnik dla rodziców
            </Link>
          </p>
        </div>
      </section>
    </>
  )
}
