import { dateText } from '@/lib/home'
import type { GameRequirements } from '@/lib/games'

/**
 * „Wymagania producenta” (boards Gra, KomputerDo). Rendered only with filled requirements (spec.
 * §8) — the caller checks `hasRequirements()`; an empty level is left out.
 */
export function RequirementsBox({
  requirements,
  className = 'gm-box cut',
}: {
  requirements: GameRequirements
  className?: string
}) {
  const levels = [
    ['Minimalne', requirements.min],
    ['Zalecane', requirements.recommended],
    ['Najwyższe', requirements.max],
  ] as const
  return (
    <div className={className}>
      <h3 className="h">Wymagania producenta</h3>
      {requirements.source && requirements.checkedAt && (
        <p className="gm-box__muted">
          Ze strony gry,{' '}
          <a className="lnk" href={requirements.source} rel="noopener noreferrer" target="_blank">
            źródło
          </a>
          , stan na {dateText(requirements.checkedAt)}.
        </p>
      )}
      <dl>
        {levels.map(([label, value]) =>
          value ? (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ) : null,
        )}
      </dl>
    </div>
  )
}

/** „Skąd są liczby” (board Gra), texts 1:1; a game's own test note goes under the settings. */
export function NumbersBox({ note }: { note: string | null }) {
  return (
    <div className="gm-box cut">
      <h3 className="h">Skąd są liczby</h3>
      <p className="gm-box__muted">Średnia klatek na sekundę w teście z tą samą kartą graficzną.</p>
      <dl>
        <div>
          <dt>Ustawienia</dt>
          <dd>{note ? `wysokie lub najwyższe, ${note}` : 'wysokie lub najwyższe'}</dd>
        </div>
        <div>
          <dt>Generator klatek</dt>
          <dd>wyłączony</dd>
        </div>
        <div>
          <dt>Źródła</dt>
          <dd>ComputerBase, TechPowerUp i inne, z linkiem</dd>
        </div>
        <div>
          <dt>Nasze pomiary</dt>
          <dd>dojdą po złożeniu pierwszych egzemplarzy</dd>
        </div>
      </dl>
    </div>
  )
}

/** „Co znaczą kolory” (board Gra), texts 1:1. */
export function ColorsBox() {
  return (
    <div className="gm-box cut">
      <h3 className="h">Co znaczą kolory</h3>
      <p className="src src--pk">
        <i aria-hidden="true" />
        Zmierzone w PRO-KOM: nasz pomiar w serwisie w Rabce.
      </p>
      <p className="src src--ind">
        <i aria-hidden="true" />
        Testy niezależne: wynik z portalu albo YouTube, ze źródłem.
      </p>
      <p className="src src--est">
        <i aria-hidden="true" />
        Szacunek: wyliczony z testów tej samej karty w innych grach, do czasu pomiaru.
      </p>
      <p className="gm-box__muted">
        Nigdy ich nie mieszamy i nie gwarantujemy klatek, bo zależą też od aktualizacji gry i
        sterowników.
      </p>
    </div>
  )
}
