import type { ComponentType, CSSProperties } from 'react'

import {
  IconBars,
  IconBox,
  IconFlame,
  IconPlug,
  IconQr,
  IconShield,
  IconTower,
  IconTruck,
  IconWifi,
  IconWrench,
  type IconProps,
} from '@/components/icons'

/**
 * Ten things in the price of every computer (spec. §4 pt 11, texts 1:1 from board Main `.inc`;
 * runda v2 §4.3: each as a card with an icon — no new promises).
 */
const ITEMS: readonly [ComponentType<IconProps>, string, string][] = [
  [IconTower, 'Windows 11', 'legalna licencja, aktywowany'],
  [IconWrench, 'Montaż', 'ręcznie, w serwisie w Rabce-Zdroju'],
  [IconFlame, 'Test obciążeniowy', 'godzina pod pełnym obciążeniem'],
  [IconBars, 'Pomiar klatek', 'w grach, na tym egzemplarzu'],
  [IconQr, 'Metryka', 'w pudełku i online pod kodem QR'],
  [IconWifi, 'Wi-Fi i Bluetooth', 'w każdym zestawie'],
  [IconPlug, 'Sterowniki i BIOS', 'aktualne, ze sterownikami karty'],
  [IconBox, 'Podstawowe programy', 'tylko darmowe, bez reklamowych dodatków'],
  [IconTruck, 'Wysyłka', 'kurier z ubezpieczeniem albo odbiór w sklepie'],
  [IconShield, 'Gwarancja 2 lata', 'na cały komputer, plus gwarancje producentów'],
]

export function Included() {
  return (
    <section className="hm-sec hm-inc" id="w-cenie" aria-labelledby="inc-title">
      <div className="wrap">
        <h2 id="inc-title" className="h" data-reveal="">
          W cenie każdego komputera
        </h2>
        <ul className="hm-inc__list" data-reveal="">
          {ITEMS.map(([Icon, title, text], i) => (
            // Icons draw column by column: the two rows of five share their timing.
            <li key={title} style={{ '--i': i % 5 } as CSSProperties}>
              <span className="hm-inc__icon" aria-hidden="true">
                <Icon size={22} />
              </span>
              <b>{title}</b>
              <span>{text}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
