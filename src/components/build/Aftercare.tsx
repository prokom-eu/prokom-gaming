import {
  IconBook,
  IconBox,
  IconDoc,
  IconPhone,
  IconPlug,
  IconPlus,
  IconQr,
  IconShield,
  IconTruck,
  IconWifi,
  IconWrench,
} from '@/components/icons'

// TODO(krystian): [serwis] confirm the list before launch (spec. §6 pt 9). The board's note
// „Lista do potwierdzenia z serwisem przed startem.” is for us, not for the customer: not shown.
const BOX = [
  {
    icon: IconBox,
    title: 'Komputer w podwójnym kartonie',
    text: 'Pianka wokół obudowy, wypełnienie w środku, żeby karta graficzna nie pracowała w transporcie.',
  },
  {
    icon: IconPlug,
    title: 'Kabel zasilający',
    text: 'Wystarczy podłączyć monitor i prąd. Reszta jest zainstalowana.',
  },
  {
    icon: IconWifi,
    title: 'Antena Wi-Fi',
    text: 'Przykręcana z tyłu, jeśli płyta ma zewnętrzną antenę.',
  },
  {
    icon: IconDoc,
    title: 'Metryka na papierze',
    text: 'Wyniki testu tego egzemplarza, numery części, pieczęć serwisanta.',
  },
  {
    icon: IconQr,
    title: 'Naklejka z kodem QR',
    text: 'Na obudowie. Otwiera metrykę online, także po latach.',
  },
  {
    icon: IconBook,
    title: 'Karton z dokumentami części',
    text: 'Instrukcje, gwarancje producentów, zapasowe śrubki i kable od płyty i zasilacza.',
  },
  {
    icon: IconWrench,
    title: 'Karta „Pierwsze uruchomienie”',
    text: 'Jedna strona: co podłączyć, gdzie zdjąć folie, jak zmienić kolor światła.',
  },
  {
    icon: IconShield,
    title: 'Dowód zakupu i gwarancja',
    text: 'Faktura VAT i karta gwarancyjna PRO-KOM na 2 lata.',
  },
]

const CARE = [
  {
    icon: IconShield,
    title: '2 lata na cały komputer',
    text: 'Plus gwarancje producentów części, wypisane z datami w metryce i w koncie.',
  },
  {
    icon: IconTruck,
    title: 'Kurier odbiera od Ciebie',
    text: 'Gdy trzeba naprawić, odbieramy komputer na nasz koszt. Możesz też oddać go w sklepie.',
  },
  {
    icon: IconPhone,
    title: 'Najpierw pomoc zdalna',
    text: 'Za Twoją zgodą i tylko na czas zgłoszenia. Często kończy się na tym, bez wysyłki.',
  },
  {
    icon: IconPlus,
    title: 'Rozbudowa bez utraty gwarancji',
    text: 'Dołóż RAM albo dysk. Gwarancja zostaje; nie obejmuje tylko uszkodzeń powstałych przy rozbudowie.',
  },
]

const WHAT_IF = [
  {
    q: 'komputer nie włącza się po rozpakowaniu?',
    a: 'Dzwonisz, sprawdzamy razem przez telefon. Jeśli to uszkodzenie w transporcie, odbieramy kurierem i naprawiamy w pierwszej kolejności.',
  },
  {
    q: 'gra zaczyna się zacinać po pół roku?',
    a: 'Zgłaszasz w koncie. Najpierw zdalnie sprawdzamy sterowniki i temperatury, potem decydujemy, czy potrzebny jest serwis.',
  },
  {
    q: 'chcesz mocniejszą kartę za rok?',
    a: 'Przyjedź albo wyślij komputer. Wymienimy kartę, a zasilacz dobraliśmy z zapasem właśnie na taki moment.',
  },
]

/** „Co znajdziesz w pudełku” (spec. §6 pt 9, board `.bx7`). */
export function InTheBox() {
  return (
    <section className="bp-box" aria-labelledby="bp-box-h">
      <div className="wrap bp-box__grid">
        <div>
          <h2 id="bp-box-h" className="h">
            Co znajdziesz
            <br />w pudełku
          </h2>
          <p>
            Rozpakowujesz, podłączasz monitor i prąd, grasz. Windows, sterowniki i aktualizacje są
            już zainstalowane.
          </p>
        </div>
        <ul className="bp-box__list">
          {BOX.map(({ icon: Icon, title, text }) => (
            <li key={title}>
              <span className="bp-box__i" aria-hidden="true">
                <Icon size={20} />
              </span>
              <b>{title}</b>
              <p>{text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

/** „Gwarancja i opieka” + „Co, jeśli…” (spec. §6 pt 10, board `.gw7`). */
export function Care() {
  return (
    <section className="bp-care" aria-labelledby="bp-care-h">
      <div className="wrap">
        <div className="bp-sh">
          <h2 id="bp-care-h" className="h">
            Gwarancja i opieka
          </h2>
          <p>
            Dwa lata gwarancji PRO-KOM na cały komputer, a nie osobno na każdą część. Masz jeden
            numer telefonu i jedną firmę, która odpowiada za całość.
          </p>
        </div>
        <ul className="bp-care__grid">
          {CARE.map(({ icon: Icon, title, text }) => (
            <li key={title}>
              <Icon />
              <b>{title}</b>
              <p>{text}</p>
            </li>
          ))}
        </ul>
        <div className="bp-whatif">
          <h3 className="h">Co, jeśli…</h3>
          <dl>
            {WHAT_IF.map((item) => (
              <div key={item.q}>
                <dt>{item.q}</dt>
                <dd>{item.a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  )
}
