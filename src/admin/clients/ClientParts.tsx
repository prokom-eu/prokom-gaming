'use client'

import { useRouter } from 'next/navigation'
import { useId, useRef, useState, useTransition, type KeyboardEvent, type ReactNode } from 'react'

import type { ClientEntry } from '../../lib/clients'
import { Icon } from '../ui/icons'
import { Sheet } from '../ui/Sheet'
import { eraseClientData, exportClientData, saveClientNote } from './actions'
import styles from './clients.module.css'

/** Tabs of the card (board Klient): arrows move between them, one panel visible. */
export function ClientTabs({ tabs }: { tabs: { label: string; content: ReactNode }[] }) {
  const base = useId()
  const [active, setActive] = useState(0)
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const onKey = (e: KeyboardEvent) => {
    const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
    if (!step) return
    e.preventDefault()
    const next = (active + step + tabs.length) % tabs.length
    setActive(next)
    refs.current[next]?.focus()
  }
  return (
    <div>
      <div className={styles.tabs} role="tablist" aria-label="Karta klienta" onKeyDown={onKey}>
        {tabs.map((t, i) => (
          <button
            key={t.label}
            ref={(el) => {
              refs.current[i] = el
            }}
            type="button"
            role="tab"
            id={`${base}-t${i}`}
            aria-controls={`${base}-p${i}`}
            aria-selected={i === active}
            tabIndex={i === active ? 0 : -1}
            className={styles.tab}
            onClick={() => setActive(i)}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tabs.map((t, i) => (
        <div
          key={t.label}
          role="tabpanel"
          id={`${base}-p${i}`}
          aria-labelledby={`${base}-t${i}`}
          hidden={i !== active}
          className={styles.panel}
        >
          {t.content}
        </div>
      ))}
    </div>
  )
}

/**
 * Phone of the client: half hidden like on the board. On the phone a `tel:` link, on a computer
 * a button that shows the whole number to copy (spec §6).
 */
export function PhoneButton({ phone, masked }: { phone: string; masked: string }) {
  const [shown, setShown] = useState(false)
  return (
    <>
      <span className={styles.phoneM}>
        <a className="pn-btn" href={`tel:${phone.replace(/[^\d+]/g, '')}`}>
          <Icon name="phone" />
          {masked}
        </a>
      </span>
      <span className={styles.phoneD}>
        <button type="button" className="pn-btn" onClick={() => setShown(true)}>
          <Icon name="phone" />
          <span className={shown ? styles.selectable : undefined}>{shown ? phone : masked}</span>
          {shown ? null : <span className="pn-sr"> — pokaż cały numer</span>}
        </button>
      </span>
    </>
  )
}

export function NoteForm({
  entry,
  target,
  id,
  initial,
}: {
  entry: ClientEntry
  target: 'account' | 'inquiry'
  id: number
  /** The account note is one text (edited); thread notes are added one by one. */
  initial: string
}) {
  const router = useRouter()
  const fieldId = useId()
  const [text, setText] = useState(initial)
  const [message, setMessage] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const save = () => {
    setMessage(null)
    start(async () => {
      const result = await saveClientNote({ entry, target, id, text })
      setMessage(result.message ?? null)
      if (result.ok) {
        if (target === 'inquiry') setText('')
        router.refresh()
      }
    })
  }
  return (
    <div className={styles.noteForm}>
      <label htmlFor={fieldId} className={styles.label}>
        Nowa notatka
      </label>
      <textarea
        id={fieldId}
        className={styles.field}
        placeholder="Widzisz ją tylko Ty i serwis"
        rows={3}
        maxLength={5000}
        value={text}
        onChange={(e) => setText(e.currentTarget.value)}
      />
      <div className={styles.row}>
        {/* TODO(krystian): button text — the board saves without a visible button. */}
        <button
          type="button"
          className="pn-btn"
          onClick={save}
          disabled={pending || text.trim() === initial.trim()}
        >
          Zapisz notatkę
        </button>
        <span className="pn-formstatus" role="status" aria-live="polite">
          {message ?? ''}
        </span>
      </div>
    </div>
  )
}

/** „Eksport danych klienta (RODO)” and „Usuń dane na żądanie…” (tab Zgody i RODO). */
export function GdprActions({ entry, admin }: { entry: ClientEntry; admin: string }) {
  const router = useRouter()
  const checkId = useId()
  const [open, setOpen] = useState(false)
  const [sure, setSure] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [pending, start] = useTransition()

  const download = () => {
    setMessage(null)
    start(async () => {
      const result = await exportClientData(entry)
      if (!result.ok) return setMessage(result.message)
      const url = URL.createObjectURL(new Blob([result.json], { type: 'application/json' }))
      const a = document.createElement('a')
      a.href = url
      a.download = result.fileName
      a.click()
      URL.revokeObjectURL(url)
    })
  }

  const erase = () => {
    start(async () => {
      const result = await eraseClientData({ entry, confirm: true })
      if (!result.ok) return setMessage(result.message)
      router.replace(`${admin}/klienci`)
    })
  }

  return (
    <>
      <div className={styles.row}>
        <button type="button" className="pn-btn" onClick={download} disabled={pending}>
          <Icon name="download" />
          Eksport danych klienta (RODO)
        </button>
        <button
          type="button"
          className={`pn-btn ${styles.danger}`}
          onClick={() => {
            setSure(false)
            setMessage(null)
            setOpen(true)
          }}
          disabled={pending}
        >
          <Icon name="trash" />
          Usuń dane na żądanie…
        </button>
      </div>
      {/* While the sheet is open its own status speaks — one message, read once. */}
      <p className="pn-formstatus" role="status" aria-live="polite">
        {open ? '' : (message ?? '')}
      </p>
      <Sheet open={open} onClose={() => setOpen(false)} label="Usuń dane klienta">
        {/* TODO(krystian): texts of the confirmation — not on the board. */}
        <h2 className={styles.sheetTitle}>Usunąć dane tego klienta?</h2>
        <p className={styles.sheetText}>
          Usuniemy zapytania z całą korespondencją, zgłoszenia i konto na stronie. W zamówieniach i
          egzemplarzach zostaną numer, zestaw, cena i metryka — bez imienia, e-maila i telefonu.
          Ślad usunięcia zostaje w „Usunięte zapytania”. Tego nie da się cofnąć.
        </p>
        <label className={styles.check} htmlFor={checkId}>
          <input
            id={checkId}
            type="checkbox"
            checked={sure}
            onChange={(e) => setSure(e.currentTarget.checked)}
          />
          <span>Klient poprosił o usunięcie danych</span>
        </label>
        <div className={styles.row}>
          <button
            type="button"
            className={`pn-btn ${styles.dangerSolid}`}
            onClick={erase}
            disabled={!sure || pending}
          >
            Usuń dane
          </button>
          <button type="button" className="pn-btn" onClick={() => setOpen(false)}>
            Anuluj
          </button>
        </div>
        <p className="pn-formstatus" role="status" aria-live="polite">
          {pending ? 'Usuwam…' : (message ?? '')}
        </p>
      </Sheet>
    </>
  )
}
