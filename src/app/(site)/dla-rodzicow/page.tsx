import type { Metadata } from 'next'

import { IconPhone } from '@/components/icons'
import { ButtonLink } from '@/components/ui/Button'
import { routes } from '@/lib/nav'
import { company, registers } from '@/lib/site'

import '@/components/content/content.css'

export const metadata: Metadata = {
  title: 'Komputer dla dziecka',
  description:
    'Komputer do gier dla dziecka bez stresu i bez żargonu: wystarczy powiedzieć, w co dziecko gra. Płacisz po ofercie, przelewem albo BLIK-iem.',
}

const STEPS = [
  {
    title: 'Napisz, w co gra',
    text: 'Wystarczy nazwa gry, np. Fortnite albo Minecraft, i rodzaj monitora. Nie musisz znać się na częściach.',
  },
  {
    title: 'Dostajesz ofertę',
    text: 'W godzinę odpisujemy z imienną listą części, ceną i terminem. Możesz ją pokazać komuś, kto się zna.',
  },
  {
    title: 'Płacisz, gdy jesteś pewien',
    text: 'Faktura pro forma, potem przelew albo BLIK. Bez pobrań i bez zaliczek w ciemno.',
  },
  {
    title: 'Komputer przyjeżdża gotowy',
    text: 'Z Windowsem, sterownikami i metryką. Wystarczy podłączyć monitor i grać. Albo odbierz w sklepie.',
  },
] as const

// The cheat sheet of the board. Colour = the first creature named (creature tokens).
const GAMES = [
  {
    games: 'Minecraft, Roblox',
    pick: 'Skrzat albo Licho',
    note: 'Płynnie na każdym monitorze FullHD.',
    color: 'var(--c-skrzat)',
  },
  {
    games: 'Fortnite, EA Sports FC',
    pick: 'Licho albo Bies',
    note: 'Wysokie ustawienia, monitor FullHD.',
    color: 'var(--c-licho)',
  },
  {
    games: 'GTA V, Wiedźmin 3',
    pick: 'Strzyga albo Kikimora',
    note: 'Duże, piękne światy w FullHD i 2K.',
    color: 'var(--c-strzyga)',
  },
  {
    games: 'Najnowsze gry AAA',
    pick: 'Baba Jaga albo Bazyliszek',
    note: 'Zapas mocy na kilka lat.',
    color: 'var(--c-baba-jaga)',
  },
] as const

// Questions of the board (not the `faq` collection: the `parents` group there asks other things).
// The only allowed mention of instalments (spec. §27.7): no offer, „Na razie nie…”.
const QUESTIONS = [
  {
    q: 'Czy komputer będzie od razu gotowy do grania?',
    a: 'Tak. Windows 11 jest aktywowany, sterowniki zainstalowane, BIOS aktualny. Podłączasz monitor, klawiaturę i myszkę.',
  },
  {
    q: 'Co, jeśli coś się zepsuje?',
    a: 'Najpierw pomagamy zdalnie. Jeśli trzeba, kurier odbiera komputer od Ciebie na nasz koszt. Gwarancja PRO-KOM obejmuje cały komputer przez 2 lata.',
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

/** „Dla rodziców” (spec. §16, boards Rodzice / Rodzice-telefon): a light page, no scene. */
export default function ParentsPage() {
  return (
    <>
      {/* Light top section: the header floats over it with dark text (globals.css). */}
      <header className="ct-par-hero" data-scene-top data-nav-light>
        <div className="wrap ct-par-hero__grid">
          <div>
            <h1 className="h">Komputer dla dziecka bez stresu i bez żargonu</h1>
            <p className="ct-par-lead">
              Rozumiemy: to duża kwota, a w sklepach wszyscy mówią w obcym języku. U nas wystarczy
              powiedzieć, w co dziecko gra. Resztą zajmiemy się my, a wszystko, co obiecujemy,
              sprawdzisz sam.
            </p>
            <div className="ct-par-cta">
              <ButtonLink href={routes.inquiry} size="lg" className="ct-btn-dark">
                Zapytaj bez zobowiązań
              </ButtonLink>
              {/* TODO(krystian): Gaming phone [SZEF] — the shop number until confirmed. */}
              <a className="lnk ct-par-phone" href={company.phoneHref}>
                <IconPhone />
                Wolę zadzwonić: {company.phone}
              </a>
            </div>
          </div>
          <div className="ct-par-card">
            <h2 className="h">Sprawdź nas, zanim zapłacisz</h2>
            <ul>
              <li>
                <Check />
                <span>
                  <b>Firma od 2004 roku.</b> {company.name}, NIP {company.nip},{' '}
                  <a href={registers.ceidg} target="_blank" rel="noopener noreferrer">
                    CEIDG
                  </a>{' '}
                  i{' '}
                  <a href={registers.vatList} target="_blank" rel="noopener noreferrer">
                    biała lista VAT
                  </a>
                  .
                </span>
              </li>
              <li>
                <Check />
                <span>
                  <b>Sklepy stacjonarne.</b> Rabka-Zdrój, ul. Orkana 16B, i Zakopane, ul. Staszica
                  8.
                </span>
              </li>
              <li>
                <Check />
                <span>
                  <b>Płacisz po ofercie.</b> Nigdy przed nią.
                </span>
              </li>
              <li>
                <Check />
                <span>
                  <b>Metryka na piśmie.</b> Wyniki testów i numery części.
                </span>
              </li>
            </ul>
          </div>
        </div>
      </header>

      <section className="ct-par-sec ct-par-steps" aria-labelledby="par-steps">
        <div className="wrap">
          <h2 id="par-steps" className="h">
            Jak to wygląda, krok po kroku
          </h2>
          <ol>
            {STEPS.map((step, i) => (
              <li key={step.title}>
                <b className="nm" aria-hidden="true">
                  {i + 1}
                </b>
                <h3 className="h">{step.title}</h3>
                <p>{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="ct-par-sec ct-par-games" aria-labelledby="par-games">
        <div className="wrap">
          <h2 id="par-games" className="h">
            W co gra Twoje dziecko?
          </h2>
          <p className="ct-par-games__lead">
            Najprostsza ściągawka. Nie musisz zapamiętywać nazw części, wystarczy nazwa gry.
          </p>
          <ul className="ct-par-games__grid">
            {GAMES.map((item) => (
              <li key={item.games} style={{ '--c': item.color } as React.CSSProperties}>
                <small>Gra w</small>
                <b>{item.games}</b>
                <span>polecamy</span>
                <strong className="nm">{item.pick}</strong>
                <p>{item.note}</p>
              </li>
            ))}
          </ul>
          <ButtonLink href={routes.gamePicker} className="ct-btn-dark">
            Sprawdź konkretną grę
          </ButtonLink>
        </div>
      </section>

      <section className="ct-sec ct-par-safe" aria-labelledby="par-safe">
        <div className="wrap ct-par-safe__grid">
          <div>
            <h2 id="par-safe" className="h ct-h2">
              Bezpieczeństwo i spokój
            </h2>
            <p className="ct-p">
              Na życzenie ustawimy konto dziecka w Windows 11 z kontrolą rodzicielską: limity czasu,
              filtrowanie stron i zgoda na zakupy w grach.
            </p>
          </div>
          <div>
            {QUESTIONS.map((item, i) => (
              <details key={item.q} className="ct-qa" open={i === 0}>
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
    </>
  )
}

function Check() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  )
}
