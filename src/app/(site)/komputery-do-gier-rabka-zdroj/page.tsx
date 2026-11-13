import type { Metadata } from 'next'
import Link from 'next/link'
import { connection } from 'next/server'

import { BreadcrumbJsonLd } from '@/components/BreadcrumbJsonLd'
import { PageHeader } from '@/components/content/PageHeader'
import { StoreMap } from '@/components/content/StoreMap'
import { ExternalLink } from '@/components/ExternalLink'
import { JsonLd } from '@/components/JsonLd'
import { ButtonLink } from '@/components/ui/Button'
import { getEnv } from '@/lib/env'
import { faqPageJsonLd } from '@/lib/faq'
import { routes } from '@/lib/nav'
import { organizationJsonLd } from '@/lib/seo'
import { company, shopDirections } from '@/lib/site'

import '@/components/content/content.css'

/*
 * „Komputery do gier w Rabce-Zdroju i na Podhalu” (SEO session 13.11.2026): one page about buying
 * locally — the shop, pickup from nearby towns, courier to all of Poland, service on the spot.
 * One page on purpose, not a page per town: near-identical town pages are „doorway pages” that
 * Google demotes. No board for it: built from the content-page parts of „O nas” and „Kontakt”.
 *
 * TODO(krystian): every text on this page is a draft (no board) — to accept before production.
 * The distances are approximate road distances from Rabka-Zdrój — check them before publishing.
 */

export const metadata: Metadata = {
  title: 'Komputery do gier w Rabce-Zdroju i na Podhalu',
  description:
    'Komputery gamingowe ze sklepu w Rabce-Zdroju: odbiór osobisty dla Nowego Targu, Zakopanego i okolic, kurier w cenie do całej Polski i serwis na miejscu.',
  alternates: { canonical: routes.local },
}

const TOWNS = [
  { name: 'Rabka-Zdrój', text: 'sklep i warsztat, ul. Orkana 16B' },
  { name: 'Jordanów', text: 'ok. 15 km' },
  { name: 'Nowy Targ', text: 'ok. 25 km' },
  { name: 'Mszana Dolna', text: 'ok. 25 km' },
  { name: 'Zakopane', text: 'ok. 45 km' },
  { name: 'Myślenice', text: 'ok. 45 km' },
  { name: 'Kraków', text: 'ok. 70 km' },
] as const

const QUESTIONS = [
  {
    question: 'Mogę odebrać komputer osobiście?',
    answer:
      'Tak, w sklepie w Rabce-Zdroju przy ul. Orkana 16B. Wybierz odbiór w zapytaniu, a gdy komputer będzie gotowy, umówimy godzinę. Przy odbiorze uruchomimy go i pokażemy wyniki z metryki.',
  },
  {
    question: 'Mieszkam poza Podhalem. Kupię u Was komputer?',
    answer:
      'Tak. Wysyłamy kurierem do całej Polski, z ubezpieczeniem w cenie. Komputer przyjeżdża gotowy: z Windowsem, sterownikami i metryką.',
  },
  {
    question: 'Płacę przy odbiorze?',
    answer:
      'Nie. Płacisz przelewem albo BLIK-iem na podstawie faktury pro forma, zanim zaczniemy montaż. Bez pobrania.',
  },
  {
    question: 'Co, jeśli coś przestanie działać?',
    answer:
      'Masz 24 miesiące gwarancji PRO-KOM na cały komputer. Z okolic przywieziesz go do sklepu, a z dalszej części Polski kurier odbierze go na nasz koszt. Najpierw spróbujemy pomóc zdalnie.',
  },
] as const

export default async function LocalShopPage() {
  // Per request like the other pages with structured data: the site address comes from the
  // server's environment, not the image build.
  await connection()
  const [, store] = organizationJsonLd(getEnv().SITE_URL)
  return (
    <>
      <BreadcrumbJsonLd crumbs={[{ name: 'Rabka-Zdrój i Podhale', path: routes.local }]} />
      <JsonLd
        data={[
          store,
          faqPageJsonLd([
            { group: 'purchase', label: '', questions: QUESTIONS.map((q, i) => ({ id: i, ...q })) },
          ]),
        ]}
      />
      <PageHeader
        scene="licho"
        size="hero"
        title="Komputery do gier w Rabce-Zdroju i na Podhalu"
        lead="Składamy i testujemy komputery gamingowe w naszym sklepie w Rabce-Zdroju, od 2004 roku w tym samym miejscu. Z Podhala odbierzesz komputer osobiście, do reszty Polski wyślemy go kurierem."
      >
        <div className="ct-cta">
          <ButtonLink href={routes.builds} size="lg">
            Zobacz zestawy
          </ButtonLink>
          <ButtonLink href={routes.inquiry} size="lg" variant="ghost">
            Wyślij zapytanie
          </ButtonLink>
        </div>
      </PageHeader>

      <section className="ct-sec" aria-labelledby="lc-shop">
        <div className="wrap ct-company">
          <div>
            <h2 id="lc-shop" className="h ct-h2">
              Sklep w Rabce-Zdroju
            </h2>
            <p className="ct-p">
              Tu składamy, testujemy i wydajemy komputery. Możesz przyjechać, zobaczyć egzemplarz na
              żywo i odpalić na nim swoją grę. Napisz wcześniej, którą istotę chcesz zobaczyć.
            </p>
            <a
              className="ct-store__map"
              href={shopDirections}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`PRO-KOM, Orkana 16B: trasa do sklepu, ${company.address} (otwiera się w nowej karcie)`}
            >
              <StoreMap id="lc-map" label="PRO-KOM, Orkana 16B" />
            </a>
          </div>
          <dl className="ct-dl">
            <div>
              <dt>Adres</dt>
              <dd>{company.address}</dd>
            </div>
            <div>
              <dt>Telefon</dt>
              <dd>
                <a href={company.phoneHref}>{company.phone}</a>
              </dd>
            </div>
            <div>
              <dt>E-mail</dt>
              <dd>
                <a href={`mailto:${company.email}`}>{company.email}</a>
              </dd>
            </div>
            <div>
              <dt>Odpowiadamy</dt>
              <dd>codziennie 8–22, zwykle w godzinę</dd>
            </div>
            <div>
              <dt>Dojazd</dt>
              <dd>
                <ExternalLink href={shopDirections}>Prowadź do sklepu</ExternalLink>
              </dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="ct-sec" aria-labelledby="lc-towns">
        <div className="wrap ct-company">
          <div>
            <h2 id="lc-towns" className="h ct-h2">
              Odbiór osobisty z Podhala i okolic
            </h2>
            <p className="ct-p">
              Z Nowego Targu, Zakopanego czy Jordanowa przyjedziesz po komputer w pół godziny do
              godziny. Przy odbiorze uruchomimy go przy Tobie i pokażemy wyniki z metryki.
            </p>
          </div>
          <dl className="ct-dl">
            {TOWNS.map((town) => (
              <div key={town.name}>
                <dt>{town.name}</dt>
                <dd>{town.text}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="ct-sec" aria-labelledby="lc-poland">
        <div className="wrap ct-company">
          <div>
            <h2 id="lc-poland" className="h ct-h2">
              Cała Polska: kurier w cenie
            </h2>
            <p className="ct-p">
              Nie musisz mieszkać w Małopolsce. Komputer wysyłamy kurierem z ubezpieczeniem w cenie,
              5–10 dni roboczych od wpłaty. Przyjeżdża gotowy: z Windowsem, sterownikami i metryką.
            </p>
          </div>
          <div>
            <h2 className="h ct-h2">Serwis na miejscu</h2>
            <p className="ct-p">
              Ta sama ekipa składa komputery i je naprawia. Rozbudowa pamięci albo dysku u nas nie
              odbiera gwarancji. Nie wiesz, który zestaw wybrać? Zacznij od{' '}
              <Link href={routes.gamePicker}>doboru pod grę</Link>, a jeśli kupujesz dla dziecka,
              zajrzyj na stronę <Link href={routes.parents}>dla rodziców</Link>.
            </p>
          </div>
        </div>
      </section>

      <section className="ct-sec ct-sec--faq" aria-labelledby="lc-faq">
        <div className="wrap">
          <h2 id="lc-faq" className="h ct-h2">
            Pytania o zakup na miejscu
          </h2>
          {QUESTIONS.map((item) => (
            <details key={item.question} className="ct-qa">
              <summary>
                {item.question}
                <i aria-hidden="true" />
              </summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="ct-final" aria-labelledby="lc-final">
        <div className="wrap">
          <h2 id="lc-final" className="h">
            Wpadnij do sklepu albo napisz
          </h2>
          <p>
            Pokażemy komputer na żywo, odpalimy grę i odpowiemy na każde pytanie. Odpisujemy
            codziennie od 8 do 22.
          </p>
          <div className="ct-cta ct-cta--center">
            <ButtonLink href={routes.inquiry} size="lg">
              Wyślij zapytanie
            </ButtonLink>
            <ButtonLink href={routes.contact} size="lg" variant="ghost">
              Kontakt i dojazd
            </ButtonLink>
          </div>
        </div>
      </section>
    </>
  )
}
