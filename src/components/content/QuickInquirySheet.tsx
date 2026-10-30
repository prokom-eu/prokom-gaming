'use client'

import Link from 'next/link'
import { useRef, useState, type FormEvent, type ReactNode } from 'react'

import { BottomSheet } from '@/components/BottomSheet'
import { Button } from '@/components/ui/Button'
import { CONSENT_CLAUSE } from '@/lib/inquiry/consent'
import { HONEYPOT_FIELD } from '@/lib/inquiry/honeypot'
import {
  EMPTY_QUICK,
  QUICK_SEND_ERRORS,
  quickErrors,
  quickPayload,
  quickSendErrorOf,
  type QuickField,
  type QuickOrder,
  type QuickSendError,
  type QuickState,
} from '@/lib/inquiry/quick'
import { MAX } from '@/lib/inquiry/rules'
import { routes } from '@/lib/nav'

type Props = {
  open: boolean
  onClose: () => void
  /** Sheet title („Zamów bon”, „Zarezerwuj egzemplarz”). */
  title: string
  /** What is being ordered, shown above the fields. */
  summary: ReactNode
  order: QuickOrder
  /** Signed „form shown at” token from the server (ADR-G005). */
  token: string
  submitLabel: string
  /** Text after sending, with the number. */
  sentText: (number: string) => ReactNode
  /** The unit was taken by someone else: the page refreshes its list. */
  onTaken?: () => void
}

const fieldId = (key: QuickField) => `qk-f-${key}`
const errorId = (key: QuickField) => `qk-err-${key}`

/**
 * One-step inquiry in a sheet (G13: `/bon`, `/gotowe`): the page holds the order, here only the
 * contact and the consent; sent to `POST /api/inquiry` with the token, honeypot and limit of the
 * form (ADR-G005). After sending the sheet shows the number.
 */
export function QuickInquirySheet({
  open,
  onClose,
  title,
  summary,
  order,
  token,
  submitLabel,
  sentText,
  onTaken,
}: Props) {
  const [state, setState] = useState<QuickState>(EMPTY_QUICK)
  const [tried, setTried] = useState(false)
  const [honeypot, setHoneypot] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<QuickSendError | null>(null)
  const [sent, setSent] = useState<string | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

  const errors = tried ? quickErrors(state) : {}
  const set = <K extends QuickField>(key: K, value: QuickState[K]) =>
    setState((s) => ({ ...s, [key]: value }))

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setTried(true)
    const first = Object.keys(quickErrors(state))[0] as QuickField | undefined
    if (first) {
      formRef.current?.querySelector<HTMLElement>(`#${fieldId(first)}`)?.focus()
      return
    }
    setSending(true)
    setSendError(null)
    try {
      const response = await fetch('/api/inquiry', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(
          quickPayload(order, state, { url: window.location.href, token, honeypot }),
        ),
      })
      const body = (await response.json().catch(() => ({}))) as {
        number?: string
        error?: string
        fields?: string[]
      }
      if (response.status === 201 && body.number) {
        setSent(body.number)
        return
      }
      const error = quickSendErrorOf(response.status, body)
      setSendError(error)
      if (error === 'taken') onTaken?.()
    } catch {
      setSendError('unavailable')
    } finally {
      setSending(false)
    }
  }

  const described = (key: QuickField) =>
    errors[key] ? { 'aria-invalid': true, 'aria-describedby': errorId(key) } : {}
  const message = (key: QuickField) =>
    errors[key] && (
      <span className="iq-err" id={errorId(key)} role="alert">
        {errors[key]}
      </span>
    )
  const [clauseHead] = CONSENT_CLAUSE.text.split('polityce prywatności')

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      label={title}
      closeLabel="Zamknij"
      side
      headerStart={<b className="qk-title">{title}</b>}
    >
      <div className="qk">
        <div className="qk-summary">{summary}</div>
        {sent ? (
          <div className="ct-ok" role="status">
            <b>Wysłane</b>
            <span>{sentText(sent)}</span>
            <span>
              Numer: <strong>{sent}</strong>
            </span>
          </div>
        ) : (
          <form ref={formRef} className="ct-form qk-form" onSubmit={onSubmit} noValidate>
            {/* Humans never see or fill this field; bots that fill every field are dropped. */}
            <div className="iq-hp" aria-hidden>
              <label>
                Strona internetowa
                <input
                  type="text"
                  name={HONEYPOT_FIELD}
                  tabIndex={-1}
                  autoComplete="off"
                  value={honeypot}
                  onChange={(e) => setHoneypot(e.target.value)}
                />
              </label>
            </div>
            <div className="iq-field">
              <label htmlFor={fieldId('name')}>Imię</label>
              <input
                id={fieldId('name')}
                className="iq-in"
                type="text"
                autoComplete="given-name"
                maxLength={MAX.name}
                value={state.name}
                onChange={(e) => set('name', e.target.value)}
                {...described('name')}
              />
              {message('name')}
            </div>
            <div className="ct-form__two">
              <div className="iq-field">
                <label htmlFor={fieldId('email')}>E-mail</label>
                <input
                  id={fieldId('email')}
                  className="iq-in"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  maxLength={MAX.email}
                  value={state.email}
                  onChange={(e) => set('email', e.target.value)}
                  {...described('email')}
                />
                {message('email')}
              </div>
              <div className="iq-field">
                <label htmlFor={fieldId('phone')}>
                  Telefon <em>(opcjonalnie)</em>
                </label>
                <input
                  id={fieldId('phone')}
                  className="iq-in"
                  type="tel"
                  autoComplete="tel"
                  inputMode="tel"
                  maxLength={MAX.phone}
                  value={state.phone}
                  onChange={(e) => set('phone', e.target.value)}
                  {...described('phone')}
                />
                {message('phone')}
              </div>
            </div>
            <div>
              <label className="iq-check">
                <input
                  id={fieldId('consent')}
                  type="checkbox"
                  checked={state.consent}
                  onChange={(e) => set('consent', e.target.checked)}
                  {...described('consent')}
                />
                <i aria-hidden />
                <span>
                  {clauseHead}
                  <Link href={routes.privacy}>polityce prywatności</Link>.
                </span>
              </label>
              {message('consent')}
            </div>
            {sendError && (
              <p className="iq-err iq-err--send" role="alert">
                {QUICK_SEND_ERRORS[sendError]}
              </p>
            )}
            <Button type="submit" size="lg" disabled={sending}>
              {/* TODO(krystian): „Wysyłam…” is not on the board (as in the G12 form). */}
              {sending ? 'Wysyłam…' : submitLabel}
            </Button>
          </form>
        )}
      </div>
    </BottomSheet>
  )
}
