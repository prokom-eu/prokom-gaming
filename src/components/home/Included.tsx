import { IconRosette } from '@/components/icons'

/** Ten things in the price of every computer (spec. §4 pt 11, texts 1:1 from board Main `.inc`). */
const ITEMS = [
  ['Windows 11', 'legalna licencja, aktywowany'],
  ['Montaż', 'ręcznie, w serwisie w Rabce-Zdroju'],
  ['Test obciążeniowy', 'godzina pod pełnym obciążeniem'],
  ['Pomiar klatek', 'w grach, na tym egzemplarzu'],
  ['Metryka', 'w pudełku i online pod kodem QR'],
  ['Wi-Fi i Bluetooth', 'w każdym zestawie'],
  ['Sterowniki i BIOS', 'aktualne, ze sterownikami karty'],
  ['Podstawowe programy', 'tylko darmowe, bez reklamowych dodatków'],
  ['Wysyłka', 'kurier z ubezpieczeniem albo odbiór w sklepie'],
  ['Gwarancja 2 lata', 'na cały komputer, plus gwarancje producentów'],
] as const

export function Included() {
  return (
    <section className="hm-sec hm-inc" aria-labelledby="inc-title">
      <div className="wrap">
        <h2 id="inc-title" className="h">
          W cenie każdego komputera
        </h2>
        <ul className="hm-inc__list">
          {ITEMS.map(([title, text]) => (
            <li key={title}>
              <IconRosette size={18} />
              <div>
                <b>{title}</b>
                <span>{text}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
