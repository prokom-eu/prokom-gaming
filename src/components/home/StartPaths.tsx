import Link from 'next/link'

import { HScroll } from '@/components/HScroll'

/** Three ways in (spec. §4 pt 3, texts 1:1 from board Main `.paths`). */
const PATHS = [
  {
    icon: 'parent',
    color: 'var(--c-rusalka)',
    title: 'Kupuję dla dziecka',
    text: 'Nie musisz znać się na częściach. Napisz, w co gra i na jakim monitorze. Resztę dobierzemy my, a ofertę z ceną wyślemy na maila.',
    link: 'Pomóż mi wybrać',
    href: '/dla-rodzicow',
  },
  {
    icon: 'game',
    color: 'var(--grom)',
    title: 'Wiem, w co gram',
    text: 'Wybierz grę i monitor. Zobaczysz klatki w każdym zestawie, od Skrzata do Peruna, z uczciwym oznaczeniem, skąd jest wynik.',
    link: 'Dobierz pod grę',
    href: '/dobor-pod-gre',
  },
  {
    icon: 'parts',
    color: 'var(--c-kikimora)',
    title: 'Znam się na częściach',
    text: 'Konfigurator z trybem eksperta: zasilacz, chłodzenie, płyta, światło. Licznik klatek przelicza się przy każdej zmianie.',
    link: 'Otwórz konfigurator',
    href: '/konfigurator',
  },
] as const

export function StartPaths() {
  return (
    <section className="hm-sec hm-paths" aria-labelledby="paths-title">
      <div className="wrap">
        <div className="hm-head hm-head--center">
          <h2 id="paths-title" className="h">
            Od czego zaczynasz?
          </h2>
          <p>Trzy drogi, ten sam cel: komputer dobrany do gier, w które naprawdę grasz.</p>
        </div>
        {/* A row that scrolls on a phone (≤ 760 px), a grid of three above. */}
        <HScroll as="ul" className="hm-paths__list">
          {PATHS.map((path) => (
            <li key={path.href}>
              <Link href={path.href} className="hm-path" style={{ ['--pc' as string]: path.color }}>
                <span className="hm-path__icon" aria-hidden="true">
                  <span style={{ ['--icon' as string]: `url(/home/path-${path.icon}.svg)` }} />
                </span>
                <h3 className="h">{path.title}</h3>
                <p>{path.text}</p>
                <span className="lnk">{path.link}</span>
              </Link>
            </li>
          ))}
        </HScroll>
      </div>
    </section>
  )
}
