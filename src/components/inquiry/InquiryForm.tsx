'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'

import { Button } from '@/components/ui/Button'
import {
  canSend,
  draftOf,
  draftQuery,
  goTo,
  LAST_STEP,
  NEXT_LABELS,
  SEND_ERRORS,
  sentSummaryOf,
  STEPS,
  stepOfFields,
  summaryOf,
  toPayload,
  visibleErrors,
  type FormData,
  type FormState,
  type Step,
} from '@/lib/inquiry/form'
import { HONEYPOT_FIELD } from '@/lib/inquiry/honeypot'
import { saveSent } from '@/lib/inquiry/sent'
import { routes } from '@/lib/nav'
import { notifyStorage, readItem, storageKeys, writeItem } from '@/lib/storage'

import { InquirySummary } from './InquirySummary'
import { StepComputer, StepContact, StepGames, StepReview } from './steps'

type SendError = keyof typeof SEND_ERRORS

/** Error of an answer that is not 201 (body as `/api/inquiry` sends it). */
function sendErrorOf(status: number, body: { error?: string; fields?: string[] }): SendError {
  if (status === 429) return 'rate_limited'
  // `rejected`: the honeypot or the form token — a person only meets an expired token.
  if (status === 400 && body.error === 'rejected') return 'expired'
  if (status === 400) return 'invalid'
  return 'unavailable'
}

/**
 * Inquiry form (spec. §10, boards Formularz / Formularz-telefon, `stany/tel-11`). The state lives
 * here; the address only opens it (`?zestaw=`, `?k=`, `?z=`) and the picked computer is kept in
 * `pkg:inquiry` (the counter in the shell). Sending goes to `POST /api/inquiry`, which checks and
 * prices everything again (ADR-G005).
 */
export function InquiryForm({
  data,
  initial,
  token,
  fromLink,
}: {
  data: FormData
  initial: FormState
  /** Signed „form shown at” token, rendered by the server (ADR-G005). */
  token: string
  /** The address named a computer; otherwise a saved draft may open instead. */
  fromLink: boolean
}) {
  const router = useRouter()
  const [state, setState] = useState<FormState>(initial)
  const [honeypot, setHoneypot] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<SendError | null>(null)
  const errors = visibleErrors(state, data)
  const summary = useMemo(() => summaryOf(state, data), [state, data])

  const update = (patch: Partial<FormState>) => setState((s) => ({ ...s, ...patch }))
  const set = (next: (state: FormState) => FormState) => setState(next)
  // The step fades in only after a move: on page load the first step is simply there.
  const [moved, setMoved] = useState(false)
  const go = (target: Step) => {
    setMoved(true)
    setSendError(null)
    setState((s) => goTo(s, data, target))
  }

  // A visit without a computer in the address opens the one picked last time: a new address, so
  // the server renders it (the page remounts this component with the new state).
  const restoring = useRef(false)
  useEffect(() => {
    if (fromLink) return
    const query = draftQuery(readItem(storageKeys.inquiry))
    if (!query) return
    restoring.current = true
    router.replace(`${routes.inquiry}?${query}`)
  }, [fromLink, router])

  // The picked computer feeds the counter in the shell (and a return visit).
  const draft = JSON.stringify(draftOf(state))
  useEffect(() => {
    if (restoring.current) return
    if (readItem(storageKeys.inquiry) !== draft && writeItem(storageKeys.inquiry, draft)) {
      notifyStorage()
    }
  }, [draft])

  // Every step change moves the focus to the step's heading (and the form into view).
  const headingRef = useRef<HTMLHeadingElement>(null)
  const firstRender = useRef(true)
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    headingRef.current?.focus({ preventScroll: true })
    headingRef.current?.closest('.iq-main')?.scrollIntoView({ block: 'start' })
  }, [state.step])

  async function send() {
    if (!canSend(state, data)) {
      // Not reachable through the buttons; the first step with errors opens with its messages.
      go(LAST_STEP)
      return
    }
    setSending(true)
    setSendError(null)
    try {
      const response = await fetch('/api/inquiry', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(toPayload(state, { url: window.location.href, token, honeypot })),
      })
      const body = (await response.json().catch(() => ({}))) as {
        number?: string
        error?: string
        fields?: string[]
      }
      if (response.status === 201 && body.number) {
        saveSent(body.number, sentSummaryOf(state, data))
        // The inquiry is sent: the counter goes back to zero.
        restoring.current = true
        writeItem(storageKeys.inquiry, '[]')
        notifyStorage()
        const params = new URLSearchParams({ nr: body.number })
        if (summary.key) params.set('istota', summary.key)
        router.push(`${routes.inquiry}/wyslane?${params.toString()}`)
        return
      }
      const error = sendErrorOf(response.status, body)
      setSendError(error)
      if (error === 'invalid') {
        const step = stepOfFields(body.fields ?? [])
        setState((s) => {
          const tried = [...s.tried] as FormState['tried']
          tried[step] = true
          return { ...s, step, tried }
        })
      }
    } catch {
      setSendError('unavailable')
    }
    setSending(false)
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    // Enter in a field moves on, like „Dalej”; on the last step it sends.
    if (state.step === LAST_STEP) void send()
    else go((state.step + 1) as Step)
  }

  const stepProps = { state, data, errors, update, set, headingRef }

  return (
    <div className="iq-grid">
      <section className="iq-main" aria-label="Formularz zapytania" data-moved={moved || undefined}>
        <ol className="iq-steps">
          {STEPS.map((title, i) => {
            const status = i < state.step ? 'done' : i === state.step ? 'now' : ''
            return (
              <li key={title} className={status}>
                <button
                  type="button"
                  aria-current={i === state.step ? 'step' : undefined}
                  onClick={() => go(i as Step)}
                >
                  <span aria-hidden>{i < state.step ? '✓' : i + 1}</span>
                  <b>{title}</b>
                </button>
              </li>
            )
          })}
        </ol>

        <form onSubmit={onSubmit} noValidate>
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

          {state.step === 0 && <StepComputer {...stepProps} />}
          {state.step === 1 && <StepGames {...stepProps} />}
          {state.step === 2 && <StepContact {...stepProps} />}
          {state.step === 3 && (
            <StepReview state={state} data={data} headingRef={headingRef} onEdit={go} />
          )}

          {sendError && (
            <p className="iq-err iq-err--send" role="alert">
              {SEND_ERRORS[sendError]}
            </p>
          )}

          <div className="iq-nav">
            {state.step > 0 && (
              <Button variant="ghost" onClick={() => go((state.step - 1) as Step)}>
                Wstecz
              </Button>
            )}
            <span className="iq-nav__s" />
            {state.step === LAST_STEP ? (
              <Button type="submit" size="lg" disabled={sending} aria-busy={sending}>
                {/* TODO(krystian): wording while sending (not on the board). */}
                {sending ? 'Wysyłam…' : 'Wyślij zapytanie'}
              </Button>
            ) : (
              <Button type="submit" size="lg">
                {NEXT_LABELS[state.step as 0 | 1 | 2]}
              </Button>
            )}
          </div>
        </form>
      </section>

      <aside className="iq-aside" aria-label="Twoje zapytanie">
        <InquirySummary summary={summary} />
      </aside>
    </div>
  )
}
