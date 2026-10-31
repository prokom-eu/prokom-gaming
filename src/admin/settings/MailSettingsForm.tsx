'use client'

import { useEffect, useRef, useState, useTransition, type FormEvent } from 'react'

import { saveMailSettings, type MailSaveState } from './actions'
import type { MailFieldName, MailFormValues } from './mailForm'

type FieldDef = { name: MailFieldName; label: string; unit: string; hint?: string }

const IDLE: MailSaveState = { status: 'idle' }

// TODO(krystian): labels and hints of the number fields — the board shows only the alarm toggle
// („Alarm: zapytanie bez odpowiedzi 45 min”, „w godzinach 8–22…”); spec §13 asks for the values.
const FIELDS: FieldDef[] = [
  { name: 'from', label: 'Odpowiadamy od godziny', unit: 'godz.' },
  { name: 'to', label: 'Odpowiadamy do godziny', unit: 'godz.' },
  {
    name: 'replySlaMinutes',
    label: 'Obietnica odpowiedzi',
    unit: 'min',
    hint: 'po tym czasie czas czekania na liście jest czerwony',
  },
  {
    name: 'replyAlarmMinutes',
    label: 'Alarm: zapytanie bez odpowiedzi',
    unit: 'min',
    hint: 'e-mail na adres alarmów, w godzinach odpowiedzi',
  },
]

/**
 * Form of the section „Zapytania i poczta” (board Ustawienia, panel spec §13). Its own save
 * button: the header button saves „Marża i narzuty”. Fields 48 px / 16 px on a phone.
 */
export function MailSettingsForm({ values }: { values: MailFormValues }) {
  const [state, setState] = useState<MailSaveState>(IDLE)
  const [version, setVersion] = useState(0)
  const [pending, startTransition] = useTransition()
  const formRef = useRef<HTMLFormElement>(null)
  const errors = state.status === 'error' ? state.errors : {}

  useEffect(() => {
    if (state.status !== 'error') return
    formRef.current
      ?.querySelector<HTMLInputElement | HTMLTextAreaElement>('[aria-invalid="true"]')
      ?.focus()
  }, [state])

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return
    const data = new FormData(event.currentTarget)
    startTransition(async () => {
      const next = await saveMailSettings(state, data)
      if (next.status === 'saved') setVersion((v) => v + 1)
      setState(next)
    })
  }

  const describedBy = (id: string, error?: string, hint?: string) =>
    [error ? `${id}-err` : '', hint ? `${id}-hint` : ''].filter(Boolean).join(' ') || undefined

  const sigError = errors.signature
  return (
    <form id="pn-mail" ref={formRef} onSubmit={onSubmit} noValidate>
      <div className="pn-fgrid" key={version}>
        {FIELDS.map((f) => {
          const id = `mail-${f.name}`
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
                  inputMode="numeric"
                  enterKeyHint="done"
                  autoComplete="off"
                  aria-invalid={error ? true : undefined}
                  aria-describedby={describedBy(id, error, f.hint)}
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
        <div className="pn-fld pn-fld--wide">
          <label htmlFor="mail-signature">Podpis</label>
          <textarea
            id="mail-signature"
            name="signature"
            rows={3}
            defaultValue={values.signature}
            aria-invalid={sigError ? true : undefined}
            aria-describedby={describedBy('mail-signature', sigError, 'hint')}
          />
          {sigError ? (
            <small className="pn-fld__err" id="mail-signature-err">
              {sigError}
            </small>
          ) : null}
          {/* TODO(krystian): text — not on the board. */}
          <small id="mail-signature-hint">
            wstawiany tylko tam, gdzie szablon ma {'{podpis}'} — nigdy dwa razy
          </small>
        </div>
      </div>

      <p className="pn-formstatus" role="status" aria-live="polite">
        {pending
          ? 'Zapisuję…' // TODO(krystian): text — not on the board
          : state.status === 'saved'
            ? 'Zapisano.' // TODO(krystian): text — not on the board
            : state.status === 'error'
              ? state.message
              : ''}
      </p>
      <button type="submit" className="pn-btn pn-btn--gold" disabled={pending}>
        Zapisz zmiany
      </button>
    </form>
  )
}
