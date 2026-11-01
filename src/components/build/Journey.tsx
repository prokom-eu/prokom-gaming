import Link from 'next/link'

import {
  IconBox,
  IconDoc,
  IconFlame,
  IconLock,
  IconMail,
  IconQr,
  IconTruck,
  IconWrench,
} from '@/components/icons'
import { routes } from '@/lib/nav'

const STEPS = [
  {
    icon: IconMail,
    title: 'Zapytanie',
    time: 'dziś',
    text: 'Wybierasz zestaw albo opisujesz, w co grasz.',
  },
  {
    icon: IconDoc,
    title: 'Oferta',
    time: 'zwykle w godzinę',
    text: 'Imienna lista części, cena i termin, codziennie 8–22.',
  },
  {
    icon: IconLock,
    title: 'Wpłata',
    time: 'oferta ważna 48 h',
    text: 'Przelew albo BLIK na podstawie pro formy.',
  },
  {
    icon: IconBox,
    title: 'Części',
    time: '1–3 dni robocze',
    text: 'Zamawiamy części pod Twój egzemplarz, z numerami seryjnymi.',
  },
  {
    icon: IconWrench,
    title: 'Montaż',
    time: '1 dzień',
    text: 'Serwisant składa ręcznie i układa kable za płytą.',
  },
  {
    icon: IconFlame,
    title: 'Test i pomiary',
    time: '1 dzień',
    text: 'Godzina pełnego obciążenia, pomiar klatek, temperatury.',
  },
  {
    icon: IconQr,
    title: 'Metryka i pakowanie',
    time: 'tego samego dnia',
    text: 'Drukujemy metrykę, naklejamy QR, pakujemy w podwójny karton.',
  },
  {
    icon: IconTruck,
    title: 'U Ciebie',
    time: '1–2 dni kurierem',
    text: 'Kurier z ubezpieczeniem albo odbiór w Rabce-Zdroju.',
  },
]

// TODO(krystian): [serwis] the length of the load test (spec. §1, „Test egzemplarza”).
const TESTS = [
  {
    value: '60 min',
    title: 'test obciążeniowy',
    text: 'Procesor i karta jednocześnie na 100%. Szukamy błędów, spadków taktowania i za wysokich temperatur.',
  },
  {
    value: '3 gry',
    title: 'pomiar klatek',
    text: 'Te same sceny dla każdego egzemplarza. Wynik trafia do metryki.',
  },
  {
    value: '100%',
    title: 'pamięć sprawdzona',
    text: 'Test pamięci RAM, żeby wykluczyć wadliwą kość, zanim zrobi to gra.',
  },
  {
    value: 'BIOS',
    title: 'i sterowniki',
    text: 'Aktualne BIOS, sterowniki karty i Windows, profil pamięci włączony.',
  },
]

/** „Od zapytania do Twojego biurka” + „Zanim wyjedzie z Rabki” (spec. §6 pt 8, board `.tr7`). */
export function Journey() {
  return (
    <section className="bp-journey" aria-labelledby="bp-journey-h">
      <div className="wrap">
        <div className="bp-sh">
          <h2 id="bp-journey-h" className="h">
            Od zapytania do Twojego biurka
          </h2>
          <p>
            Pięć do dziesięciu dni roboczych od wpłaty. Na każdym etapie wiesz, co się dzieje:
            status widzisz w koncie, a my piszemy, gdy komputer wyjeżdża.
          </p>
        </div>
        <ol className="bp-steps">
          {STEPS.map(({ icon: Icon, title, time, text }, i) => (
            <li key={title}>
              <span className="bp-steps__i">
                <Icon size={20} />
                <span className="bp-steps__n" aria-hidden="true">
                  {i + 1}
                </span>
              </span>
              <b>{title}</b>
              <em>{time}</em>
              <p>{text}</p>
            </li>
          ))}
        </ol>

        <div className="bp-tests">
          <div>
            <h3 className="h">Zanim wyjedzie z Rabki</h3>
            <p>
              Każdy egzemplarz przechodzi te same testy. Wyniki dostajesz w metryce, nie w
              obietnicy.
            </p>
            <Link className="lnk" href={routes.certificate}>
              Zobacz przykładową metrykę
            </Link>
          </div>
          <ul>
            {TESTS.map((t) => (
              <li key={t.title}>
                <b className="nm">{t.value}</b>
                <span>{t.title}</span>
                <p>{t.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
