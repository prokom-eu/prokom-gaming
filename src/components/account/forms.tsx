'use client'

import { useRouter } from 'next/navigation'
import { useState, type FormEvent, type ReactNode } from 'react'

import { Chip } from '@/components/ui/Chip'
import { TICKET_CATEGORIES, TICKET_DESCRIPTION_MAX } from '@/lib/account/tickets'
import { PASSWORD_MIN_LENGTH } from '@/lib/auth/password'
import { ACCOUNT_CONSENT_CLAUSE } from '@/lib/inquiry/consent'
import { FORM_TOKEN_FIELD, HONEYPOT_FIELD } from '@/lib/inquiry/honeypot'
import { routes } from '@/lib/nav'

// Forms of the customer account (G14). Sign-in, sign-out and passwords go to Payload's own REST
// endpoints of `customers`; everything else to `/api/konto/*`. TODO(krystian): the messages are
// drafts — no board has them.

type Status = { kind: 'idle' | 'sending' | 'ok' } | { kind: 'error'; message: string }

const NETWORK = 'Nie udało się połączyć. Sprawdź internet i spróbuj jeszcze raz.'

async function postJson(url: string, body: unknown, method = 'POST') {
  return fetch(url, {
    method,
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function Message({ status }: { status: Status }) {
  if (status.kind !== 'error') return null
  return (
    <p className="iq-err iq-err--send" role="alert">
      {status.message}
    </p>
  )
}

function Field({ id, label, children }: { id: string; label: ReactNode; children: ReactNode }) {
  return (
    <div className="iq-field">
      <label htmlFor={id}>{label}</label>
      {children}
    </div>
  )
}

/** Sign-in (`POST /api/customers/login`, Payload sets the HTTP-only cookie). */
export function LoginForm() {
  const router = useRouter()
  const [status, setStatus] = useState<Status>({ kind: 'idle' })

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setStatus({ kind: 'sending' })
    try {
      const response = await postJson('/api/customers/login', {
        email: String(form.get('email') ?? '').trim(),
        password: String(form.get('password') ?? ''),
      })
      if (response.ok) {
        router.replace(routes.account)
        router.refresh()
        return
      }
      setStatus({
        kind: 'error',
        message:
          response.status === 403
            ? 'Najpierw potwierdź adres e-mail — link wysłaliśmy po założeniu konta.'
            : response.status === 423 || response.status === 429
              ? 'Za dużo nieudanych prób. Konto jest zablokowane na 15 minut.'
              : 'Nieprawidłowy e-mail albo hasło.',
      })
    } catch {
      setStatus({ kind: 'error', message: NETWORK })
    }
  }

  return (
    <form onSubmit={submit} noValidate={false}>
      <Field id="kt-email" label="E-mail">
        <input
          id="kt-email"
          className="iq-in"
          name="email"
          type="email"
          autoComplete="email"
          required
        />
      </Field>
      <Field id="kt-password" label="Hasło">
        <input
          id="kt-password"
          className="iq-in"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </Field>
      <Message status={status} />
      <button type="submit" className="btn" disabled={status.kind === 'sending'}>
        {status.kind === 'sending' ? 'Loguję…' : 'Zaloguj się'}
      </button>
    </form>
  )
}

/** Sign-up (`POST /api/konto/rejestracja`): the account waits for the e-mail link. */
export function RegisterForm({ formToken }: { formToken: string }) {
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const [fields, setFields] = useState<string[]>([])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setStatus({ kind: 'sending' })
    setFields([])
    try {
      const response = await postJson('/api/konto/rejestracja', {
        name: String(form.get('name') ?? ''),
        email: String(form.get('email') ?? ''),
        password: String(form.get('password') ?? ''),
        consent: {
          accepted: form.get('consent') === 'on',
          clauseVersion: ACCOUNT_CONSENT_CLAUSE.version,
        },
        [HONEYPOT_FIELD]: String(form.get(HONEYPOT_FIELD) ?? ''),
        [FORM_TOKEN_FIELD]: formToken,
      })
      if (response.status === 201) {
        setStatus({ kind: 'ok' })
        return
      }
      const body = (await response.json().catch(() => ({}))) as { fields?: string[] }
      setFields(body.fields ?? [])
      setStatus({
        kind: 'error',
        message:
          response.status === 429
            ? 'Za dużo prób z tego adresu. Spróbuj za kilka minut.'
            : response.status === 400 && body.fields?.length
              ? 'Popraw zaznaczone pola.'
              : 'Nie udało się założyć konta. Odśwież stronę i spróbuj jeszcze raz.',
      })
    } catch {
      setStatus({ kind: 'error', message: NETWORK })
    }
  }

  if (status.kind === 'ok') {
    return (
      <p className="kt-auth__msg" role="status">
        Sprawdź skrzynkę: wysłaliśmy link do potwierdzenia adresu. Po kliknięciu zalogujesz się i
        zobaczysz swoje komputery.
      </p>
    )
  }

  const invalid = (field: string) => (fields.includes(field) ? { 'aria-invalid': true } : {})
  return (
    <form onSubmit={submit}>
      <Field id="kt-name" label="Imię">
        <input
          id="kt-name"
          className="iq-in"
          name="name"
          autoComplete="given-name"
          maxLength={80}
          required
          {...invalid('name')}
        />
      </Field>
      <Field id="kt-email" label="E-mail (ten sam, który podajesz w zapytaniu)">
        <input
          id="kt-email"
          className="iq-in"
          name="email"
          type="email"
          autoComplete="email"
          required
          {...invalid('email')}
        />
      </Field>
      <Field id="kt-password" label={`Hasło (co najmniej ${PASSWORD_MIN_LENGTH} znaków)`}>
        <input
          id="kt-password"
          className="iq-in"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={PASSWORD_MIN_LENGTH}
          required
          {...invalid('password')}
        />
      </Field>
      {/* Honeypot: hidden from people and screen readers, bots fill it. */}
      <input
        type="text"
        name={HONEYPOT_FIELD}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="iq-hp"
      />
      <label className="iq-check iq-check--mt">
        <input type="checkbox" name="consent" required {...invalid('consent.accepted')} />
        <i aria-hidden />
        <span>
          {ACCOUNT_CONSENT_CLAUSE.text.replace(' szczegóły w polityce prywatności.', ' ')}
          szczegóły w <a href={routes.privacy}>polityce prywatności</a>.
        </span>
      </label>
      <Message status={status} />
      <button type="submit" className="btn" disabled={status.kind === 'sending'}>
        {status.kind === 'sending' ? 'Zakładam…' : 'Załóż konto'}
      </button>
    </form>
  )
}

/** „Nie pamiętam hasła” (`POST /api/customers/forgot-password`) — the same answer for any e-mail. */
export function ForgotForm() {
  const [status, setStatus] = useState<Status>({ kind: 'idle' })

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setStatus({ kind: 'sending' })
    try {
      await postJson('/api/customers/forgot-password', {
        email: String(form.get('email') ?? '').trim(),
      })
      setStatus({ kind: 'ok' })
    } catch {
      setStatus({ kind: 'error', message: NETWORK })
    }
  }

  if (status.kind === 'ok') {
    return (
      <p className="kt-auth__msg" role="status">
        Jeśli ten adres ma u nas konto, za chwilę dostaniesz link do ustawienia nowego hasła. Link
        działa przez godzinę.
      </p>
    )
  }
  return (
    <form onSubmit={submit}>
      <Field id="kt-email" label="E-mail konta">
        <input
          id="kt-email"
          className="iq-in"
          name="email"
          type="email"
          autoComplete="email"
          required
        />
      </Field>
      <Message status={status} />
      <button type="submit" className="btn" disabled={status.kind === 'sending'}>
        {status.kind === 'sending' ? 'Wysyłam…' : 'Wyślij link'}
      </button>
    </form>
  )
}

/** New password from the e-mail link (`POST /api/customers/reset-password` signs in). */
export function ResetForm({ token }: { token: string }) {
  const router = useRouter()
  const [status, setStatus] = useState<Status>({ kind: 'idle' })

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setStatus({ kind: 'sending' })
    try {
      const response = await postJson('/api/customers/reset-password', {
        token,
        password: String(form.get('password') ?? ''),
      })
      if (response.ok) {
        router.replace(routes.account)
        router.refresh()
        return
      }
      setStatus({
        kind: 'error',
        message:
          response.status === 400
            ? `Hasło musi mieć co najmniej ${PASSWORD_MIN_LENGTH} znaków.`
            : 'Link wygasł albo był już użyty. Poproś o nowy.',
      })
    } catch {
      setStatus({ kind: 'error', message: NETWORK })
    }
  }

  return (
    <form onSubmit={submit}>
      <Field id="kt-password" label={`Nowe hasło (co najmniej ${PASSWORD_MIN_LENGTH} znaków)`}>
        <input
          id="kt-password"
          className="iq-in"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={PASSWORD_MIN_LENGTH}
          required
        />
      </Field>
      <Message status={status} />
      <button type="submit" className="btn" disabled={status.kind === 'sending'}>
        {status.kind === 'sending' ? 'Zapisuję…' : 'Ustaw hasło'}
      </button>
    </form>
  )
}

/** „Wyloguj” in the account menu. */
export function LogoutButton() {
  const router = useRouter()
  return (
    <button
      type="button"
      onClick={async () => {
        await fetch('/api/customers/logout', { method: 'POST', credentials: 'same-origin' }).catch(
          () => undefined,
        )
        router.replace(routes.home)
        router.refresh()
      }}
    >
      Wyloguj
    </button>
  )
}

/** „Zgłoś problem” (board Konto): category chips, description, remote-help consent. */
export function TicketForm({ units }: { units: readonly { id: number; label: string }[] }) {
  const router = useRouter()
  const [category, setCategory] = useState<string>(TICKET_CATEGORIES[0].value)
  const [status, setStatus] = useState<Status>({ kind: 'idle' })

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formElement = event.currentTarget
    const form = new FormData(formElement)
    setStatus({ kind: 'sending' })
    try {
      const response = await postJson('/api/konto/zgloszenie', {
        unit: Number(form.get('unit') ?? units[0]?.id),
        category,
        description: String(form.get('description') ?? ''),
        remoteHelpConsent: form.get('remote') === 'on',
      })
      if (response.status === 201) {
        formElement.reset()
        setStatus({ kind: 'ok' })
        router.refresh()
        return
      }
      setStatus({
        kind: 'error',
        message:
          response.status === 401
            ? 'Sesja wygasła. Zaloguj się jeszcze raz.'
            : 'Opisz krótko, co się dzieje (do 2000 znaków).',
      })
    } catch {
      setStatus({ kind: 'error', message: NETWORK })
    }
  }

  return (
    <form className="kt-form" onSubmit={submit}>
      {units.length > 1 && (
        <div className="iq-field">
          <label htmlFor="kt-unit">Komputer</label>
          <select id="kt-unit" className="iq-in" name="unit">
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.label}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="kt-chips" role="group" aria-label="Co się dzieje">
        {TICKET_CATEGORIES.map((c) => (
          <Chip key={c.value} pressed={category === c.value} onClick={() => setCategory(c.value)}>
            {c.label}
          </Chip>
        ))}
      </div>
      <div className="iq-field">
        <label htmlFor="kt-desc">Co się dzieje?</label>
        <textarea
          id="kt-desc"
          className="iq-in"
          name="description"
          rows={3}
          maxLength={TICKET_DESCRIPTION_MAX}
          placeholder="Np. od wczoraj Fortnite wyłącza się po kilku minutach"
          required
        />
      </div>
      <label className="iq-check">
        <input type="checkbox" name="remote" />
        <i aria-hidden />
        <span>Zgadzam się na pomoc zdalną przy tym zgłoszeniu.</span>
      </label>
      <Message status={status} />
      <button type="submit" className="btn" disabled={status.kind === 'sending'}>
        {status.kind === 'sending' ? 'Wysyłam…' : 'Wyślij zgłoszenie'}
      </button>
      {status.kind === 'ok' && (
        <p className="kt-form__ok" role="status">
          Zgłoszenie przyjęte. Odezwiemy się najpierw z propozycją pomocy zdalnej.
        </p>
      )}
    </form>
  )
}

/** „Dane i zgody”: name and phone (the e-mail is the key to the orders and stays). */
export function ProfileForm({ name, phone }: { name: string; phone: string }) {
  const router = useRouter()
  const [status, setStatus] = useState<Status>({ kind: 'idle' })

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setStatus({ kind: 'sending' })
    try {
      const response = await postJson(
        '/api/konto/dane',
        { name: String(form.get('name') ?? ''), phone: String(form.get('phone') ?? '') },
        'PATCH',
      )
      if (response.ok) {
        setStatus({ kind: 'ok' })
        router.refresh()
        return
      }
      setStatus({ kind: 'error', message: 'Sprawdź imię i numer telefonu.' })
    } catch {
      setStatus({ kind: 'error', message: NETWORK })
    }
  }

  return (
    <form className="kt-profile" onSubmit={submit}>
      <div className="iq-two">
        <Field id="kt-pname" label="Imię">
          <input
            id="kt-pname"
            className="iq-in"
            name="name"
            defaultValue={name}
            maxLength={80}
            required
          />
        </Field>
        <Field id="kt-pphone" label="Telefon (opcjonalnie)">
          <input
            id="kt-pphone"
            className="iq-in"
            name="phone"
            type="tel"
            defaultValue={phone}
            maxLength={30}
          />
        </Field>
      </div>
      <Message status={status} />
      <button type="submit" className="btn btn--ghost" disabled={status.kind === 'sending'}>
        Zapisz dane
      </button>
      {status.kind === 'ok' && (
        <p className="kt-form__ok" role="status">
          Zapisane.
        </p>
      )}
    </form>
  )
}

/** Removes one saved configuration; says so when it did not work. */
export function DeleteSavedButton({ id, label }: { id: string; label: string }) {
  const router = useRouter()
  const [failed, setFailed] = useState(false)
  return (
    <>
      <button
        type="button"
        className="kt-saved__del"
        aria-label={`Usuń konfigurację ${label}`}
        onClick={async () => {
          setFailed(false)
          const response = await fetch(`/api/konto/konfiguracje?id=${encodeURIComponent(id)}`, {
            method: 'DELETE',
            credentials: 'same-origin',
          }).catch(() => null)
          if (response?.ok) router.refresh()
          else setFailed(true)
        }}
      >
        Usuń
      </button>
      {failed && (
        <span className="iq-err" role="alert">
          Nie udało się usunąć.
        </span>
      )}
    </>
  )
}
