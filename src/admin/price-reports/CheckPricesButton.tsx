'use client'

import { useRouter } from 'next/navigation'
import { useId, useState, useTransition } from 'react'

import { Icon } from '../ui/icons'
import { startCheck } from './actions'

/**
 * „Sprawdź ceny” (panel spec §2 top bar, §2a „Więcej”, §11): starts a check and opens its report.
 * Off without a Claude key, with the reason next to it (spec §18 pt 2).
 */
export function CheckPricesButton({
  enabled,
  reportsHref,
  wide = false,
}: {
  enabled: boolean
  reportsHref: string
  wide?: boolean
}) {
  const router = useRouter()
  // The button is rendered twice (top bar and „Więcej”): ids must differ (review P7).
  const noteId = useId()
  const [message, setMessage] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const run = () =>
    start(async () => {
      try {
        const outcome = await startCheck()
        if (outcome.ok) router.push(`${reportsHref}/${outcome.id}`)
        else setMessage(outcome.message)
      } catch {
        // TODO(krystian): message not on the board.
        setMessage('Nie udało się uruchomić — sprawdź połączenie.')
      }
    })
  // TODO(krystian): the reason when the check is off (no board).
  const off = 'Sprawdzanie cen jest wyłączone: brak klucza ANTHROPIC_API_KEY na serwerze.'
  return (
    <span className={wide ? 'pn-check pn-check--wide' : 'pn-check'}>
      <button
        type="button"
        className="pn-btn pn-btn--gold"
        onClick={run}
        disabled={!enabled || pending}
        aria-describedby={!enabled || message ? noteId : undefined}
      >
        <Icon name="refresh" />
        {pending ? 'Uruchamiam…' : 'Sprawdź ceny'}
      </button>
      {!enabled || message ? (
        <small id={noteId} className="pn-check__note" role="status">
          {message ?? off}
        </small>
      ) : null}
    </span>
  )
}
