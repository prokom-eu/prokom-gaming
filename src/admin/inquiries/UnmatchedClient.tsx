'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition, type FormEvent } from 'react'

import { Icon } from '../ui/icons'
import { attachUnmatched, rejectUnmatched, type UnmatchedResult } from './unmatchedActions'

/**
 * Actions of one message in „Nieprzypisane” (P4): attach to an inquiry by its number (then the
 * thread opens) or reject (back to the list). The number field suggests the one found in the subject, if any.
 */
export function UnmatchedActions({
  id,
  suggested,
  threadHref,
  listHref,
}: {
  id: number
  suggested: string | null
  /** `/admin/zapytania?nr=` — the number is appended after a successful attach. */
  threadHref: string
  /** „Nieprzypisane” without a message: after a reject the next one opens (computer). */
  listHref: string
}) {
  const router = useRouter()
  const [number, setNumber] = useState(suggested ?? '')
  const [result, setResult] = useState<UnmatchedResult | null>(null)
  const [pending, startTransition] = useTransition()

  function attach(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return
    startTransition(async () => {
      const r = await attachUnmatched({ id, number })
      setResult(r)
      if (r.ok && r.number) router.push(`${threadHref}${encodeURIComponent(r.number)}`)
    })
  }

  function reject() {
    if (pending) return
    startTransition(async () => {
      const r = await rejectUnmatched({ id })
      setResult(r)
      if (r.ok) router.push(listHref)
    })
  }

  return (
    <form className="pn-cmp pn-unm" onSubmit={attach} aria-label="Przypnij wiadomość">
      <div className="pn-fld">
        <label htmlFor="pn-unm-nr">Numer zapytania</label>
        <input
          id="pn-unm-nr"
          value={number}
          onChange={(e) => setNumber(e.target.value)}
          placeholder="PKG-2026-0047"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          enterKeyHint="done"
          maxLength={40}
        />
      </div>
      <div className="pn-cmp__row">
        <button type="button" className="pn-btn pn-btn--quiet" disabled={pending} onClick={reject}>
          Odrzuć
        </button>
        <button type="submit" className="pn-btn pn-btn--gold" disabled={pending || !number.trim()}>
          <Icon name="check" size={17} />
          Przypnij do zapytania
        </button>
      </div>
      <p className="pn-formstatus" role="status" aria-live="polite">
        {/* TODO(krystian): text „Zapisuję…” — not on the board. */}
        {pending ? 'Zapisuję…' : (result?.message ?? '')}
      </p>
    </form>
  )
}
