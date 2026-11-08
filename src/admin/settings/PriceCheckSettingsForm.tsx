'use client'

import { useState, useTransition, type FormEvent } from 'react'

import { savePriceCheckSettings, type PriceCheckSaveState } from './actions'
import type { DayKey, PriceCheckValues } from './priceCheckForm'

const DAYS: { key: DayKey; label: string }[] = [
  { key: 'mon', label: 'pon.' },
  { key: 'tue', label: 'wt.' },
  { key: 'wed', label: 'śr.' },
  { key: 'thu', label: 'czw.' },
  { key: 'fri', label: 'pt.' },
  { key: 'sat', label: 'sob.' },
  { key: 'sun', label: 'niedz.' },
]

const NUMBERS: {
  name: 'hour' | 'outlierPct' | 'alertChangePct' | 'monthlyBudgetUsd'
  label: string
  unit: string
  hint?: string
}[] = [
  { name: 'hour', label: 'Godzina sprawdzania', unit: 'godz.', hint: 'czas polski' },
  {
    name: 'alertChangePct',
    label: 'Alarm: zmiana kosztu ponad',
    unit: '%',
    hint: 'inne niż próg zatwierdzania cen',
  },
  {
    name: 'outlierPct',
    label: 'Do ręcznego sprawdzenia przy zmianie ponad',
    unit: '%',
    hint: 'bez propozycji kosztu',
  },
  { name: 'monthlyBudgetUsd', label: 'Limit wydatków Claude na miesiąc', unit: 'USD' },
]

/**
 * Form of the section „Sprawdzanie cen” (board Ustawienia, panel spec §13). Its own save button.
 * TODO(krystian): labels and hints beyond the board.
 */
export function PriceCheckSettingsForm({ values }: { values: PriceCheckValues }) {
  const [state, setState] = useState<PriceCheckSaveState>({ status: 'idle' })
  const [pending, startTransition] = useTransition()
  const errors = state.status === 'error' ? state.errors : {}

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return
    const data = new FormData(event.currentTarget)
    startTransition(async () => {
      try {
        setState(await savePriceCheckSettings(state, data))
      } catch {
        setState({
          status: 'error',
          message: 'Nie udało się wysłać — sprawdź połączenie.',
          errors: {},
        })
      }
    })
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <fieldset className="pn-days">
        <legend>Dni sprawdzania</legend>
        {DAYS.map((d) => (
          <label key={d.key}>
            <input
              type="checkbox"
              name="days"
              value={d.key}
              defaultChecked={values.days.includes(d.key)}
            />
            {d.label}
          </label>
        ))}
      </fieldset>
      <div className="pn-fgrid">
        {NUMBERS.map((f) => {
          const id = `pc-${f.name}`
          const error = errors[f.name]
          return (
            <div className="pn-fld" key={f.name}>
              <label htmlFor={id}>
                {f.label}
                <span className="pn-sr"> ({f.unit})</span>
              </label>
              <span className="pn-fld__in">
                <input
                  id={id}
                  name={f.name}
                  defaultValue={values[f.name]}
                  inputMode="decimal"
                  enterKeyHint="done"
                  autoComplete="off"
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? `${id}-err` : f.hint ? `${id}-hint` : undefined}
                />
                <span className="pn-fld__unit" aria-hidden="true">
                  {f.unit}
                </span>
              </span>
              {error ? (
                <small id={`${id}-err`} className="pn-fld__err">
                  {error}
                </small>
              ) : f.hint ? (
                <small id={`${id}-hint`}>{f.hint}</small>
              ) : null}
            </div>
          )
        })}
        <div className="pn-fld">
          <label htmlFor="pc-costMethod">Koszt rynkowy</label>
          <select id="pc-costMethod" name="costMethod" defaultValue={values.costMethod}>
            <option value="lowest">najniższa dostępna oferta</option>
            <option value="avg2">średnia z 2 najniższych</option>
          </select>
        </div>
      </div>
      <div className="pn-checks">
        <label>
          <input type="checkbox" name="alertMinMargin" defaultChecked={values.alertMinMargin} />
          Alarm: minimum marży przy obecnych cenach
        </label>
        <label>
          <input type="checkbox" name="alertUnavailable" defaultChecked={values.alertUnavailable} />
          Alarm: część z zestawu niedostępna
        </label>
      </div>
      <div className="pn-formstatus" aria-live="polite">
        {state.status === 'saved' ? <span>Zapisano ustawienia sprawdzania cen.</span> : null}
        {state.status === 'error' ? <span className="pn-fld__err">{state.message}</span> : null}
      </div>
      <button type="submit" className="pn-btn pn-btn--gold" disabled={pending}>
        {pending ? 'Zapisuję…' : 'Zapisz sprawdzanie cen'}
      </button>
    </form>
  )
}
