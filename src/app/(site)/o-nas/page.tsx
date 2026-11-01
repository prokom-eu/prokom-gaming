import type { Metadata } from 'next'

import { BreadcrumbJsonLd } from '@/components/BreadcrumbJsonLd'
import { PageHeader } from '@/components/content/PageHeader'
import { Sigil } from '@/components/Sigil'
import { ButtonLink } from '@/components/ui/Button'
import { routes } from '@/lib/nav'
import { company, registers } from '@/lib/site'

import '@/components/content/content.css'

export const metadata: Metadata = {
  title: 'O nas',
  description:
    'PRO-KOM z Rabki-Zdroju: od 2004 roku składamy komputery, naprawiamy sprzęt i opiekujemy się IT firm. Sklep w Rabce-Zdroju, dane firmy i rejestry.',
  alternates: { canonical: routes.about },
}

const NUMBERS = [
  { value: '2004', text: 'od tego roku składamy komputery w Rabce-Zdroju' },
  { value: '100+', text: 'firm z Małopolski pod naszą opieką IT' },
  { value: '2 lata', text: 'gwarancji na cały komputer, z odbiorem od Ciebie' },
] as const

// TODO(krystian): year of the till service [SZEF] — the board has
// „[rok]”; until then the entries show without a year (no placeholders, spec. §27.7).
const HISTORY = [
  {
    year: '2004',
    title: 'Sklep w Rabce-Zdroju',
    text: 'Tadeusz Wójciak otwiera PRO-KOM przy ulicy Orkana. Od początku składamy komputery na zamówienie i naprawiamy sprzęt.',
  },
  {
    year: '',
    title: 'Serwis kas i opieka IT dla firm',
    text: 'Zostajemy autoryzowanym serwisem kas Posnet i Elzab, wdrażamy programy InsERT i GoPOS. Dziś opiekujemy się ponad setką firm.',
  },
  {
    year: '2026',
    title: 'PRO-KOM Gaming',
    text: 'Szesnaście komputerów do gier, każdy z metryką i pomiarem klatek. Ta sama ekipa, to samo miejsce, nowa pasja.',
  },
] as const

const VALUES = [
  {
    sigil: 'perun',
    color: 'var(--c-perun)',
    title: 'Mówimy, skąd są liczby',
    text: 'Przy każdym wyniku piszemy, czy zmierzyliśmy go sami, czy pochodzi z niezależnych testów, czy jest szacunkiem.',
  },
  {
    sigil: 'baba',
    color: 'var(--c-baba-jaga)',
    title: 'Odpisuje człowiek, nie bot',
    text: 'Każde zapytanie czyta i odpisuje Krystian, codziennie od 8 do 22. Z imienną listą części i ceną.',
  },
  {
    sigil: 'wampir',
    color: 'var(--c-wampir)',
    title: 'Komputer z metryką, nie z magazynu',
    text: 'Każdy egzemplarz składamy pod zamówienie, testujemy godzinę pod obciążeniem i dajemy dokument z wynikami.',
  },
  {
    sigil: 'licho',
    color: 'var(--light-las)',
    title: 'Jesteśmy na miejscu',
    text: 'Dwa sklepy na Podhalu i prawdziwy adres. Gdy coś nie działa, kurier odbierze komputer na nasz koszt.',
  },
] as const

const LINES = [
  {
    name: 'PRO-KOM Biznes',
    text: 'Kasy fiskalne, programy InsERT i GoPOS, opieka IT dla firm.',
    href: 'https://pro-kom.eu',
  },
  {
    name: 'PRO-KOM Instalacje',
    text: 'Monitoring, sieci, smart home i nagłośnienie.',
    href: 'https://pro-kom.eu',
  },
  {
    name: 'PRO-KOM Serwis',
    text: 'Naprawy komputerów, laptopów i telefonów.',
    href: 'https://prokomserwis.pl',
  },
  {
    name: 'PRO-KOM Software',
    text: 'Strony, panele i aplikacje dla firm.',
    href: 'https://pro-kom.eu',
  },
] as const

/** „O nas” (spec. §17, boards OFirmie / OFirmie-telefon). */
export default function AboutPage() {
  return (
    <>
      <BreadcrumbJsonLd crumbs={[{ name: 'O nas', path: routes.about }]} />
      <PageHeader
        scene="perun"
        size="hero"
        title="Składamy komputery w Rabce-Zdroju od 2004 roku"
        lead="PRO-KOM to firma z Podhala. Od ponad dwudziestu lat składamy komputery, naprawiamy sprzęt i opiekujemy się systemami ponad stu firm. PRO-KOM Gaming to odpowiedź na pytanie, które w sklepie słyszymy najczęściej: jaki komputer do gier kupić, żeby nie przepłacić i się nie rozczarować."
      >
        <div className="ct-cta">
          <ButtonLink href={routes.builds} size="lg">
            Zobacz zestawy
          </ButtonLink>
          <ButtonLink href={routes.contact} size="lg" variant="ghost">
            Przyjedź do nas
          </ButtonLink>
        </div>
      </PageHeader>

      <section className="ct-numbers" aria-label="PRO-KOM w liczbach">
        <div className="wrap">
          <ul>
            {NUMBERS.map((n) => (
              <li key={n.value}>
                <b className="nm">{n.value}</b>
                <span>{n.text}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="ct-sec" aria-labelledby="ab-history">
        <div className="wrap ct-history">
          <div>
            <h2 id="ab-history" className="h ct-h2">
              Dwadzieścia dwa lata w jednym miejscu
            </h2>
            <p className="ct-p">
              Nie jesteśmy start-upem, który zniknie po sezonie. Ten sam adres, ta sama ekipa i ci
              sami ludzie po drugiej stronie telefonu, także wtedy, gdy po dwóch latach coś
              przestanie działać.
            </p>
          </div>
          <ol className="ct-timeline">
            {HISTORY.map((item) => (
              <li key={item.title}>
                <span className="nm">{item.year}</span>
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* TODO(krystian): „Ludzie, którzy złożą Twój komputer” (3 cards) and „Warsztat w Rabce”
          (5 photos) come back with the photos and the consents of the people [SZEF] — the board
          has only photo placeholders and „[imię serwisanta]” (spec. §17, §26, §27.7). */}

      <section className="ct-sec" aria-labelledby="ab-values">
        <div className="wrap">
          <h2 id="ab-values" className="h ct-h2">
            W co wierzymy
          </h2>
          <ul className="ct-values">
            {VALUES.map((v) => (
              <li key={v.title} style={{ '--c': v.color } as React.CSSProperties}>
                <span className="ct-values__sigil">
                  <Sigil id={v.sigil} size={54} />
                </span>
                <div>
                  <h3>{v.title}</h3>
                  <p>{v.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="ct-sec" aria-labelledby="ab-lines">
        <div className="wrap">
          <div className="ct-row">
            <h2 id="ab-lines" className="h ct-h2">
              PRO-KOM to nie tylko gaming
            </h2>
            <p className="ct-p">
              Te same ręce i ta sama firma obsługują sklepy, biura i domy na całym Podhalu.
            </p>
          </div>
          <div className="ct-lines">
            {LINES.map((line) => (
              <a key={line.name} className="ct-line" href={line.href}>
                <b>{line.name}</b>
                <span>{line.text}</span>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="ct-sec" aria-labelledby="ab-company">
        <div className="wrap ct-company">
          <div>
            <h2 id="ab-company" className="h ct-h2">
              Dane firmy
            </h2>
            <p className="ct-p">
              Sprawdź nas, zanim zapłacisz. Tak robią rozsądni klienci i tak sami kupujemy.
            </p>
          </div>
          <dl className="ct-dl">
            <div>
              <dt>Firma</dt>
              <dd>{company.name}</dd>
            </div>
            <div>
              <dt>Adres</dt>
              <dd>{company.address}</dd>
            </div>
            <div>
              <dt>NIP</dt>
              <dd>{company.nip}</dd>
            </div>
            <div>
              <dt>Rejestry</dt>
              <dd>
                <a href={registers.ceidg} target="_blank" rel="noopener noreferrer">
                  CEIDG
                </a>{' '}
                i{' '}
                <a href={registers.vatList} target="_blank" rel="noopener noreferrer">
                  biała lista podatników VAT
                </a>
              </dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="ct-final" aria-labelledby="ab-final">
        <div className="wrap">
          <h2 id="ab-final" className="h">
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
