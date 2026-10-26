'use client'

import { useState } from 'react'

import type { FpsRow } from '@/lib/fps'

import { BottomSheet } from './BottomSheet'

/**
 * „Jak liczymy?” (spec. §6.4, ADR-G004 §6): a link under an FPS list that opens a sheet with the
 * texts of the panels „Skąd są liczby” and „Co znaczą kolory” from board Gra (1:1) and the source
 * of every number on the list — label, settings and a link to the test (estimates have none).
 */
export function HowWeMeasure({ rows }: { rows: readonly FpsRow[] }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        className="lnk fps__how"
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        Jak liczymy?
      </button>
      <BottomSheet
        open={open}
        onClose={() => setOpen(false)}
        label="Jak liczymy?"
        closeLabel="Zamknij"
        headerStart={<b>Jak liczymy?</b>}
      >
        <div className="how">
          <h3 className="h">Skąd są liczby</h3>
          <p className="how__note">Średnia klatek na sekundę w teście z tą samą kartą graficzną.</p>
          <dl>
            <div>
              <dt>Ustawienia</dt>
              <dd>wysokie lub najwyższe</dd>
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
          <p className="how__note">
            Nigdy ich nie mieszamy i nie gwarantujemy klatek, bo zależą też od aktualizacji gry i
            sterowników.
          </p>

          {/* TODO(krystian): heading and note below are not on any board — confirm the wording.
              Source labels name the test platform's parts on purpose (ADR-G004 §6). */}
          <h3 className="h">Źródła wyników na tej liście</h3>
          <p className="how__note">
            Karta i procesor w nazwie testu to sprzęt platformy testowej portalu, nie części naszego
            zestawu.
          </p>
          <ul className="how__sources">
            {rows.map((row) => (
              <li key={row.game}>
                <b>{row.name}</b>
                <span>{row.setting}. </span>
                {row.sourceUrl ? (
                  <a href={row.sourceUrl} target="_blank" rel="noopener noreferrer">
                    {row.sourceLabel}
                  </a>
                ) : (
                  row.sourceLabel
                )}
              </li>
            ))}
          </ul>
        </div>
      </BottomSheet>
    </>
  )
}
