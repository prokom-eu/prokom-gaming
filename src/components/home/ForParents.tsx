import Link from 'next/link'

import { company } from '@/lib/site'

/**
 * "Kupujesz komputer dla dziecka?" (spec. §4 pt 9, board Main `.par`): the light section. Texts 1:1
 * from the board; name and NIP from the same place as the footer (`lib/site.ts`).
 */
export function ForParents() {
  const promises = [
    {
      title: 'Prawdziwa firma od 2004 roku',
      text: `${company.name}, NIP ${company.nip}. Sprawdzisz nas w CEIDG i na białej liście podatników VAT.`,
    },
    {
      title: 'Przyjedź i zobacz',
      text: 'Sklepy w Rabce-Zdroju i w Zakopanem. Przy odbiorze włączymy komputer i odpalimy grę przy Tobie.',
    },
    {
      title: 'Odpisuje człowiek, nie bot',
      text: 'Każde zapytanie czyta Krystian. Możesz dopytać o wszystko, także przez telefon, zanim cokolwiek zapłacisz.',
    },
    {
      title: 'Gwarancja z odbiorem od Ciebie',
      text: 'Gdy coś nie działa, najpierw pomagamy zdalnie. Jeśli trzeba, kurier odbiera komputer na nasz koszt.',
    },
  ]
  return (
    <section className="hm-sec hm-par" aria-labelledby="par-title">
      <div className="wrap hm-par__grid">
        <div>
          <h2 id="par-title" className="h">
            Kupujesz komputer dla dziecka?
          </h2>
          <p className="hm-lead">
            Rozumiemy, to duża kwota i dużo nieznanych słów. Dlatego wszystko, co obiecujemy, możesz
            sprawdzić sam, zanim zapłacisz. A jeśli wolisz porozmawiać, zadzwoń.
          </p>
          <div className="hm-cta">
            <Link className="btn hm-par__btn" href="/dla-rodzicow">
              Przewodnik dla rodziców
            </Link>
            <Link className="lnk" href="/zapytanie">
              Zapytaj bez zobowiązań
            </Link>
          </div>
        </div>
        <ul className="hm-par__list">
          {promises.map((p) => (
            <li key={p.title}>
              <h3>{p.title}</h3>
              <p>{p.text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
