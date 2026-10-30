'use client'

import Link from 'next/link'
import { useState } from 'react'

import { encodeConfig } from '@/lib/configurator'
import { routes } from '@/lib/nav'
import type { Config } from '@/lib/pricing/types'

type State = 'idle' | 'saving' | 'saved' | 'login' | 'full' | 'error'

/**
 * „Zapisz na koncie” in the configurator summary (spec. §7): `POST /api/konto/konfiguracje`.
 * Without a session the button turns into a link to the sign-in page — the configuration stays
 * in the address and in `localStorage`, nothing is lost.
 * TODO(krystian): the messages are drafts — the board has only the button.
 */
export function SaveConfigButton({
  config,
  light,
  label,
}: {
  config: Config
  light: string | null
  label: string
}) {
  const [state, setState] = useState<State>('idle')

  async function save() {
    setState('saving')
    try {
      const response = await fetch('/api/konto/konfiguracje', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ label, k: encodeConfig(config), light }),
      })
      setState(
        response.status === 201
          ? 'saved'
          : response.status === 401
            ? 'login'
            : response.status === 409
              ? 'full'
              : 'error',
      )
    } catch {
      setState('error')
    }
  }

  return (
    <span className="cf-save" role="status">
      {state === 'saved' ? (
        <span className="btn btn--ghost cf-save__done">Zapisane na koncie</span>
      ) : (
        <button
          type="button"
          className="btn btn--ghost"
          onClick={save}
          disabled={state === 'saving'}
        >
          Zapisz na koncie
        </button>
      )}
      {state === 'login' && (
        <small>
          <Link href={routes.accountLogin}>Zaloguj się</Link> albo{' '}
          <Link href={routes.accountRegister}>załóż konto</Link>, żeby zapisać.
        </small>
      )}
      {state === 'full' && <small>Masz już 20 zapisanych — usuń którąś w koncie.</small>}
      {state === 'error' && <small>Nie udało się zapisać. Spróbuj jeszcze raz.</small>}
    </span>
  )
}
