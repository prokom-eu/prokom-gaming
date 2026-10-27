import Link from 'next/link'

/** Four steps with their time (spec. §4 pt 5, texts 1:1 from board Main `.how`). No instalments. */
const STEPS = [
  {
    title: 'Wysyłasz zapytanie',
    text: 'Wybierz zestaw albo napisz, w co grasz i na jakim monitorze. Wystarczy kilka zdań.',
    time: 'kilka minut',
  },
  {
    title: 'Dostajesz ofertę',
    text: 'Imienna lista części, aktualna cena i termin. Odpisujemy codziennie od 8 do 22.',
    time: 'zwykle w godzinę',
  },
  {
    title: 'Płacisz, jak Ci wygodnie',
    text: 'Przelew albo BLIK, na podstawie faktury pro forma. Bez pobrań.',
    time: 'oferta ważna 48 godzin',
  },
  {
    title: 'Składamy i wysyłamy',
    text: 'Montaż, test i pomiar klatek w Rabce. Kurier z ubezpieczeniem albo odbiór w sklepie.',
    time: '5–10 dni roboczych',
  },
] as const

export function HowToBuy() {
  return (
    <section className="hm-sec hm-buy" aria-labelledby="buy-title">
      <div className="wrap">
        <div className="hm-head hm-head--row">
          <h2 id="buy-title" className="h">
            Jak kupić, skoro nie ma przycisku „Kup”
          </h2>
          <p>
            Ceny części zmieniają się codziennie, więc najpierw dostajesz ofertę z aktualną ceną.
            Płacisz dopiero wtedy, gdy ją zaakceptujesz, a zapytanie do niczego Cię nie zobowiązuje.
          </p>
        </div>
        <ol className="hm-buy__steps">
          {STEPS.map((step, i) => (
            <li key={step.title}>
              <span className="hm-buy__n nm" aria-hidden="true">
                {i + 1}
              </span>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
              <em>{step.time}</em>
            </li>
          ))}
        </ol>
        <div className="hm-buy__cta">
          <Link className="btn btn--lg" href="/zapytanie">
            Wyślij zapytanie
          </Link>
          <span>Nie wiesz, co wybrać? Opisz, w co grasz. Resztę dobierzemy.</span>
        </div>
      </div>
    </section>
  )
}
