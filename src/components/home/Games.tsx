import type { GamesPanelData } from '@/lib/home'

import { GamesPanel } from './GamesPanel'

/** "W co grasz?" (spec. §4 pt 6). Without data (empty database) only the text stays. */
export function Games({ panel }: { panel: GamesPanelData | null }) {
  return (
    <section className="hm-sec hm-games" aria-labelledby="games-title">
      <div className="wrap hm-games__grid">
        <div className="hm-games__intro">
          <h2 id="games-title" className="h">
            W co grasz?
          </h2>
          <p className="hm-lead">
            Trzydzieści trzy gry, od Minecrafta po Cyberpunka. Kliknij swoją i wybierz monitor.
            Zobaczysz, ile klatek da każdy poziom mocy, i od razu wiesz, skąd jest wynik: z
            niezależnego testu, przeliczone z testów czy to nasz szacunek.
          </p>
        </div>
        {panel && <GamesPanel data={panel} />}
      </div>
    </section>
  )
}
