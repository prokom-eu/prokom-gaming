import Link from 'next/link'

import {
  IconDoc,
  IconGamepad,
  IconMail,
  IconPhone,
  IconShield,
  IconShop,
  IconTruck,
} from '@/components/icons'
import { ExternalLink, RegisterLinks } from '@/components/ExternalLink'
import { company, shopDirections } from '@/lib/site'

/**
 * „Kupujesz komputer dla dziecka?” (spec. §4 pt 9, runda v2 §4.1): the light section. A parent
 * should see in five seconds that this is a real company to talk to — four proof cards with links
 * to the public registers (NIP from `lib/site.ts`, as in the footer), the phone, and how buying
 * goes in three steps. No photos of people until there are consents.
 */
export function ForParents() {
  return (
    <section className="hm-sec hm-par" id="dla-rodzicow-sekcja" aria-labelledby="par-title">
      <div className="wrap">
        <div className="hm-par__grid">
          <div>
            <h2 id="par-title" className="h" data-reveal="">
              Kupujesz komputer dla dziecka?
            </h2>
            <p className="hm-lead" data-reveal="">
              Rozumiemy, to duża kwota i dużo nieznanych słów. Dlatego wszystko, co obiecujemy,
              możesz sprawdzić sam, zanim zapłacisz. A jeśli wolisz porozmawiać, zadzwoń.
            </p>
            <div className="hm-cta">
              <Link className="btn hm-par__btn" href="/dla-rodzicow">
                Przewodnik dla rodziców
              </Link>
              <a className="btn hm-par__call" href={company.phoneHref}>
                <IconPhone size={17} />
                Zadzwoń: {company.phone}
              </a>
            </div>
          </div>
          <ul className="hm-par__cards" data-reveal="">
            <li>
              <span className="hm-par__icon" aria-hidden="true">
                <IconDoc size={22} />
              </span>
              <h3>Prawdziwa firma od 2004 roku</h3>
              <p>
                {company.name}, NIP {company.nip}. Wpisz NIP w publicznym rejestrze i sprawdź nas
                sam.
              </p>
              <p className="hm-par__links">
                <RegisterLinks />
              </p>
            </li>
            <li>
              <span className="hm-par__icon" aria-hidden="true">
                <IconMail size={22} />
              </span>
              <h3>Odpisuje człowiek, nie bot</h3>
              <p>
                Każde zapytanie czyta Krystian. Możesz dopytać o wszystko, także przez telefon,
                zanim cokolwiek zapłacisz.
              </p>
            </li>
            <li>
              <span className="hm-par__icon" aria-hidden="true">
                <IconShop size={22} />
              </span>
              <h3>Przyjedź i zobacz</h3>
              <p>
                Sklep w Rabce-Zdroju, {company.postal.street}. Przy odbiorze włączymy komputer i
                odpalimy grę przy Tobie.
              </p>
              <p className="hm-par__links">
                <ExternalLink href={shopDirections} className="lnk">
                  Prowadź do sklepu
                </ExternalLink>
              </p>
            </li>
            <li>
              <span className="hm-par__icon" aria-hidden="true">
                <IconShield size={22} />
              </span>
              <h3>Gwarancja 24 miesiące z odbiorem od Ciebie</h3>
              <p>
                Gdy coś nie działa, najpierw pomagamy zdalnie. Jeśli trzeba, kurier odbiera komputer
                na nasz koszt.
              </p>
            </li>
          </ul>
        </div>

        <div className="hm-par__how">
          <h3>Jak to wygląda</h3>
          <ol>
            <li>
              <IconGamepad size={22} />
              <span>Piszesz, w co gra dziecko</span>
            </li>
            <li>
              <IconMail size={22} />
              <span>
                Odpisujemy z ceną i terminem <small>zwykle w godzinę, 8–22</small>
              </span>
            </li>
            <li>
              <IconTruck size={22} />
              <span>
                Odbierasz w Rabce albo kurierem <small>z metryką komputera</small>
              </span>
            </li>
          </ol>
        </div>
      </div>
    </section>
  )
}
