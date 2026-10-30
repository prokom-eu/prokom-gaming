'use client'

import Link from 'next/link'
import { useRef, useState, type FormEvent } from 'react'

import { Button } from '@/components/ui/Button'
import { CONTACT_CONSENT_CLAUSE } from '@/lib/inquiry/consent'
import {
  CONTACT_SEND_ERRORS,
  contactErrors,
  contactFieldOf,
  contactPayload,
  contactSendErrorOf,
  EMPTY_CONTACT,
  type ContactField,
  type ContactSendError,
  type ContactState,
} from '@/lib/inquiry/contact'
import { HONEYPOT_FIELD } from '@/lib/inquiry/honeypot'
import { MAX } from '@/lib/inquiry/rules'
import { routes } from '@/lib/nav'

const fieldId = (key: ContactField) => `ct-f-${key}`
const errorId = (key: ContactField) => `ct-err-${key}`

/**
 * „Krótkie pytanie?” (spec. §18, board Kontakt): an inquiry of type `contact` through
 * `POST /api/inquiry` — same token, honeypot and limit as the form (ADR-G005). Messages appear
 * after the first try, like the board; after sending, the box with the number replaces the form.
 */
export function ContactForm({ token }: { token: string }) {
  const [state, setState] = useState<ContactState>(EMPTY_CONTACT)
  const [tried, setTried] = useState(false)
  const [honeypot, setHoneypot] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<ContactSendError | null>(null)
  const [sent, setSent] = useState<{ number: string; email: string } | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

  const errors = tried ? contactErrors(state) : {}
  const set = <K extends ContactField>(key: K, value: ContactState[K]) =>
    setState((s) => ({ ...s, [key]: value }))

  const focusField = (key: ContactField) =>
    formRef.current?.querySelector<HTMLElement>(`#${fieldId(key)}`)?.focus()

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setTried(true)
    const first = Object.keys(contactErrors(state))[0] as ContactField | undefined
    if (first) {
      focusField(first)
      return
    }
    setSending(true)
    setSendError(null)
    try {
      const response = await fetch('/api/inquiry', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(contactPayload(state, { url: window.location.href, token, honeypot })),
      })
      const body = (await response.json().catch(() => ({}))) as {
        number?: string
        error?: string
        fields?: string[]
      }
      if (response.status === 201 && body.number) {
        setSent({ number: body.number, email: state.email.trim() })
        return
      }
      setSendError(contactSendErrorOf(response.status, body.error))
      const field = contactFieldOf(body.fields ?? [])
      if (field) focusField(field)
    } catch {
      setSendError('unavailable')
    } finally {
      setSending(false)
    }
  }

  if (sent) {
    return (
      <div className="ct-ok" role="status">
        <b>Wiadomość wysłana</b>
        <span>Odpiszemy na {sent.email}, zwykle w ciągu godziny.</span>
        {/* Spec. §27.4: every path shows the number (the board's box has none). */}
        <span>
          Numer: <strong>{sent.number}</strong>
        </span>
      </div>
    )
  }

  const described = (key: ContactField) =>
    errors[key] ? { 'aria-invalid': true, 'aria-describedby': errorId(key) } : {}
  const message = (key: ContactField) =>
    errors[key] && (
      <span className="iq-err" id={errorId(key)} role="alert">
        {errors[key]}
      </span>
    )
  const [clauseHead] = CONTACT_CONSENT_CLAUSE.text.split('polityce prywatności')

  return (
    <form ref={formRef} className="ct-form" onSubmit={onSubmit} noValidate>
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
      <div className="ct-form__two">
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
      </div>
      <div className="iq-field">
        <label htmlFor={fieldId('message')}>Wiadomość</label>
        <textarea
          id={fieldId('message')}
          className="iq-in"
          rows={5}
          maxLength={MAX.message}
          placeholder="W czym możemy pomóc?"
          value={state.message}
          onChange={(e) => set('message', e.target.value)}
          {...described('message')}
        />
        {message('message')}
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
          {CONTACT_SEND_ERRORS[sendError]}
        </p>
      )}
      <Button type="submit" size="lg" disabled={sending}>
        {/* TODO(krystian): „Wysyłam…” is not on the board (as in the G12 form). */}
        {sending ? 'Wysyłam…' : 'Wyślij wiadomość'}
      </Button>
    </form>
  )
}
