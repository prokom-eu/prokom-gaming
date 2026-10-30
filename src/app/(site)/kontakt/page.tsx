import type { Metadata } from 'next'
import Link from 'next/link'
import { connection } from 'next/server'

import { ContactForm } from '@/components/content/ContactForm'
import { PageHeader } from '@/components/content/PageHeader'
import { StoreMap } from '@/components/content/StoreMap'
import { IconDoc, IconMail, IconPhone } from '@/components/icons'
import { ButtonLink } from '@/components/ui/Button'
import { getEnv } from '@/lib/env'
import { issueFormToken } from '@/lib/inquiry/spam'
import { routes } from '@/lib/nav'
import { company } from '@/lib/site'

import '@/components/content/content.css'
import '@/components/inquiry/inquiry.css'

export const metadata: Metadata = {
  title: 'Kontakt',
  description:
    'Zapytanie o komputer, telefon i e-mail PRO-KOM Gaming. Sklep w Rabce-Zdroju i salon w Zakopanem. Odpisujemy codziennie od 8 do 22.',
}

const mapsHref = (query: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`

const STORES = [
  {
    key: 'rabka',
    title: 'Sklep w Rabce-Zdroju',
    address: 'ul. Orkana 16B, 34-700 Rabka-Zdrój',
    pin: 'PRO-KOM, Orkana 16B',
    text: 'Tu składamy i testujemy komputery. Zobaczysz egzemplarz na żywo i odbierzesz zamówienie.',
    maps: mapsHref('PRO-KOM Orkana 16B Rabka-Zdrój'),
  },
  {
    key: 'zakopane',
    title: 'Salon w Zakopanem',
    address: 'ul. Staszica 8, 34-500 Zakopane',
    pin: 'PRO-KOM, Staszica 8',
    text: 'Odbiór zamówienia po umówieniu. Napisz wcześniej, przywieziemy komputer z Rabki.',
    maps: mapsHref('Staszica 8 Zakopane'),
  },
] as const

// Board-only questions of the contact page (not the `faq` collection: they do not appear on
// `/pytania` in this wording).
const QUESTIONS = [
  {
    q: 'Mogę przyjechać i zobaczyć komputer?',
    a: 'Tak, w sklepie w Rabce-Zdroju. Napisz wcześniej, którą istotę chcesz zobaczyć, a przygotujemy egzemplarz i odpalimy Twoją grę.',
  },
  {
    q: 'Wystawiacie fakturę na firmę?',
    a: 'Tak. Zaznacz to w zapytaniu i podaj NIP. Fakturę pro forma dostaniesz razem z ofertą do akceptacji.',
  },
  {
    q: 'Do której odpisujecie?',
    a: 'Na zapytania o komputery codziennie od 8 do 22, także w weekendy. Wiadomość wysłaną w nocy przeczytamy rano.',
  },
  {
    q: 'Coś nie działa w komputerze od Was. Co robić?',
    a: 'Zgłoś problem w koncie albo zadzwoń. Najpierw spróbujemy pomóc zdalnie, a jeśli trzeba, kurier odbierze komputer na nasz koszt.',
  },
] as const

/** „Kontakt” (spec. §18, boards Kontakt / Kontakt-telefon). */
export default async function ContactPage() {
  // The form token is signed per request (ADR-G005): the page must not be static.
  await connection()
  const token = issueFormToken(getEnv().PAYLOAD_SECRET)

  return (
    <>
      <PageHeader
        scene="licho"
        size="tall"
        title="Napisz, zadzwoń albo wpadnij do sklepu"
        lead="Na pytania o komputery odpisujemy codziennie od 8 do 22, zwykle w ciągu godziny. Odpisuje człowiek, który zna każdy nasz zestaw."
      />

      <section className="ct-channels" aria-label="Jak się z nami skontaktować">
        <div className="wrap ct-channels__grid">
          <article className="ct-channel ct-channel--hl">
            <span className="ct-channel__icon">
              <IconMail size={24} strokeWidth={1.6} />
            </span>
            <h2 className="h">Zapytanie o komputer</h2>
            <p>Najszybsza droga do oferty z ceną. Trzy krótkie kroki.</p>
            <small>Odpowiedź zwykle w godzinę, codziennie 8–22</small>
            <ButtonLink href={routes.inquiry}>Wypełnij formularz</ButtonLink>
          </article>
          <article className="ct-channel">
            <span className="ct-channel__icon">
              <IconPhone size={24} strokeWidth={1.6} />
            </span>
            <h2 className="h">Zadzwoń</h2>
            {/* TODO(krystian): Gaming phone and its hours [SZEF] — until then the shop number
                only, without the board's placeholders (spec. §27.7). */}
            <p>{company.phone}</p>
            <ButtonLink href={company.phoneHref} variant="ghost">
              Zadzwoń teraz
            </ButtonLink>
          </article>
          <article className="ct-channel">
            <span className="ct-channel__icon">
              <IconDoc size={24} strokeWidth={1.6} />
            </span>
            <h2 className="h">Napisz e-mail</h2>
            <p>{company.email}</p>
            <small>Odpisujemy codziennie 8–22</small>
            <ButtonLink href={`mailto:${company.email}`} variant="ghost">
              Napisz e-mail
            </ButtonLink>
          </article>
        </div>
      </section>

      <section className="ct-sec" aria-labelledby="ct-stores">
        <div className="wrap">
          <div className="ct-row">
            <h2 id="ct-stores" className="h ct-h2">
              Nasze sklepy
            </h2>
            <p className="ct-p">
              Dwa miejsca na Podhalu. Komputery składamy i testujemy w Rabce-Zdroju.
            </p>
          </div>
          <div className="ct-stores">
            {STORES.map((store) => (
              <article key={store.title} className="ct-store">
                <a
                  className="ct-store__map"
                  href={store.maps}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Otwórz mapę: ${store.address}`}
                >
                  <StoreMap id={`ct-map-${store.key}`} label={store.pin} />
                </a>
                <div className="ct-store__body">
                  <h3 className="h">{store.title}</h3>
                  <p className="ct-store__address">{store.address}</p>
                  <p>{store.text}</p>
                  {/* TODO(krystian): opening hours of both shops [SZEF] — the line with the
                      clock comes back when they are known (no placeholders, spec. §27.7). */}
                  <a
                    className="lnk ct-gold ct-store__go"
                    href={store.maps}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Prowadź do sklepu
                  </a>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="ct-sec ct-sec--ask" aria-labelledby="ct-ask">
        <div className="wrap ct-ask">
          <div>
            <h2 id="ct-ask" className="h ct-h2">
              Krótkie pytanie?
            </h2>
            <p className="ct-p">
              Jeśli nie chodzi o wycenę, napisz tutaj. Na wycenę lepiej wysłać{' '}
              <Link href={routes.inquiry}>zapytanie o komputer</Link>.
            </p>
            <ContactForm token={token} />
          </div>
          <div>
            <div className="ct-owner">
              <h3 className="h">Masz już komputer od nas?</h3>
              <p>
                Zgłoś problem w koncie albo zadzwoń. Najpierw pomożemy zdalnie, a gdy trzeba, kurier
                odbierze komputer na nasz koszt.
              </p>
              <div className="ct-owner__actions">
                <ButtonLink href={routes.account} variant="ghost">
                  Zgłoś problem
                </ButtonLink>
                <Link className="lnk ct-gold" href={routes.certificate}>
                  Sprawdź metrykę
                </Link>
              </div>
            </div>
            <div className="ct-owner__faq">
              {QUESTIONS.map((item) => (
                <details key={item.q} className="ct-qa">
                  <summary>
                    {item.q}
                    <i aria-hidden="true" />
                  </summary>
                  <p>{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
