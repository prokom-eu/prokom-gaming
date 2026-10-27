/** The five stages every computer goes through (spec. §4 pt 7, names from the board). */
const STAGES = ['Części', 'Montaż', 'Test obciążeniowy', 'Pomiar klatek', 'Metryka i wysyłka']

/**
 * "Teraz w warsztacie w Rabce" under the hero (spec. §4 pt 2). Until `GET /api/warsztat` exists
 * (G14) it shows the fixed process, not orders: the board's sample orders would be made-up data.
 * TODO(G14): live stages of current orders (build name and colour only, ADR-G005).
 */
export function WorkshopStrip() {
  return (
    <section className="workshop" aria-labelledby="workshop-title">
      <h2 id="workshop-title" className="workshop__title">
        Teraz w warsztacie w Rabce
      </h2>
      <ol className="workshop__list">
        {STAGES.map((stage) => (
          <li key={stage}>{stage}</li>
        ))}
      </ol>
    </section>
  )
}
