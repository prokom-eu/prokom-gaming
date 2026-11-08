'use client'

import { useEffect, useRef, useState, useTransition, type FormEvent } from 'react'

import { Icon } from '../ui/icons'
import { saveSettings, type SaveState } from './actions'
import type { FieldName, FormValues } from './form'

type FieldDef = { name: FieldName; label: string; unit: '%' | 'zł'; hint?: string }

const IDLE: SaveState = { status: 'idle' }

/**
 * Form of the section "Marża i narzuty" (board Ustawienia): labels, units and hints 1:1. Fields
 * 48 px / 16 px on a phone (spec §2a pt 8), `inputmode="decimal"`. The header button
 * "Zapisz zmiany" submits it through `form="pn-settings"`.
 */
export function SettingsForm({
  values,
  hints,
}: {
  values: FormValues
  /** Hints computed on the server (Skrzat exception, service price on the site). */
  hints: Partial<Record<FieldName, string>>
}) {
  const [state, setState] = useState<SaveState>(IDLE)
  // Bumped only after a save: the fields then show the stored values again. An error never
  // remounts them, so what was typed stays to be corrected.
  const [version, setVersion] = useState(0)
  const [pending, startTransition] = useTransition()
  const formRef = useRef<HTMLFormElement>(null)
  const errors = state.status === 'error' ? state.errors : {}

  // After a refused save, focus goes to the first field to correct.
  useEffect(() => {
    if (state.status !== 'error') return
    formRef.current?.querySelector<HTMLInputElement>('[aria-invalid="true"]')?.focus()
  }, [state])

  // Not `<form action>`: React resets an action form afterwards, which would wipe what was typed
  // when the server returns errors.
  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    // The header button lives outside this component and cannot be disabled while saving.
    if (pending) return
    const data = new FormData(event.currentTarget)
    startTransition(async () => {
      const next = await saveSettings(state, data)
      if (next.status === 'saved') setVersion((v) => v + 1)
      setState(next)
    })
  }

  const FIELDS: FieldDef[] = [
    {
      name: 'minMargin',
      label: 'Minimalna marża komputera',
      unit: '%',
      hint: 'strażnik blokuje publikację poniżej',
    },
    {
      name: 'warnMargin',
      label: 'Ostrzegaj, gdy zestaw ma mniej niż',
      unit: '%',
      hint: 'żółty znacznik na pulpicie i w raporcie',
    },
    { name: 'fullhd', label: 'Narzut poziomu FullHD', unit: '%', hint: hints.fullhd },
    { name: 'qhd', label: 'Narzut poziomu 2K', unit: '%' },
    { name: 'uhd', label: 'Narzut poziomu 4K', unit: '%' },
    { name: 'flagship', label: 'Narzut flagowca (RTX 5090)', unit: '%' },
    { name: 'ramSsd', label: 'Narzut RAM i dysków', unit: '%', hint: hints.ramSsd },
    {
      name: 'caseCoolerBuffer',
      label: 'Bufor obudów i chłodzeń',
      unit: 'zł',
      hint: 'cena = koszt + bufor, bez narzutu',
    },
    {
      name: 'whiteSurcharge',
      label: 'Dopłata za wersję białą',
      unit: 'zł',
      hint: 'do ceny poziomu',
    },
    {
      name: 'serviceCost',
      label: 'Usługa: Windows, wysyłka, opakowanie',
      unit: 'zł',
      hint: hints.serviceCost,
    },
    { name: 'roundingStep', label: 'Zaokrąglenie ceny opcji w górę do', unit: 'zł' },
    {
      name: 'publishThreshold',
      label: 'Próg zmiany ceny do zatwierdzenia',
      unit: '%',
      hint: 'mniejsze zmiany czekają',
    },
  ]

  return (
    <form id="pn-settings" ref={formRef} onSubmit={onSubmit} noValidate>
      <div className="pn-fgrid" key={version}>
        {FIELDS.map((f) => {
          const id = `set-${f.name}`
          const error = errors[f.name]
          const described = [error ? `${id}-err` : '', f.hint ? `${id}-hint` : '']
            .filter(Boolean)
            .join(' ')
          return (
            <div className="pn-fld" key={f.name}>
              <label htmlFor={id}>
                {f.label}
                <span className="pn-sr"> ({f.unit === '%' ? 'procent' : 'zł'})</span>
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
                  aria-describedby={described || undefined}
                />
                <span className="pn-fld__unit" aria-hidden="true">
                  {f.unit}
                </span>
              </span>
              {error ? (
                <small className="pn-fld__err" id={`${id}-err`}>
                  {error}
                </small>
              ) : null}
              {f.hint ? <small id={`${id}-hint`}>{f.hint}</small> : null}
            </div>
          )
        })}
      </div>

      <div className="pn-manual">
        <Icon name="shield" size={20} />
        <div>
          <b>Publikacja zawsze ręczna</b>
          <small>
            każdą zmianę ceny zatwierdzasz w „Do zatwierdzenia”, po sprawdzeniu przez strażnika
            marży
          </small>
        </div>
      </div>

      <p className="pn-formstatus" role="status" aria-live="polite">
        {pending
          ? 'Zapisuję…' // TODO(krystian): text — not on the board
          : state.status === 'saved'
            ? // TODO(krystian): text — not on the board
              'Zapisano. Nowe ceny wg tych zasad czekają w „Do zatwierdzenia”.'
            : state.status === 'error'
              ? state.message
              : ''}
      </p>
      {/* Phone: the save button sits under the fields too (the header row scrolls away). */}
      <button type="submit" className="pn-btn pn-btn--gold pn-m-only" disabled={pending}>
        Zapisz zmiany
      </button>
    </form>
  )
}
