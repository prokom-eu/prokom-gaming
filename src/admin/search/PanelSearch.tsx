'use client'

import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'

import { Icon } from '../ui/icons'
import { searchPanel } from './actions'
import type { PanelSearchResult } from './match'

const PLACEHOLDER = 'Szukaj zestawu, części, obudowy…'
const LABEL = 'Szukaj w panelu'
const DELAY_MS = 250

type State =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'done'; result: PanelSearchResult }
  | { kind: 'error' }

/**
 * Debounced search through the server action. The state is derived from the newest answer: an
 * answer for an older query counts as "still loading", so a slow reply never shows stale hits.
 */
function useSearch(query: string): State {
  const q = query.trim()
  const [answer, setAnswer] = useState<{ q: string; result: PanelSearchResult | null } | null>(null)
  useEffect(() => {
    if (q.length < 2) return
    let live = true
    const timer = setTimeout(() => {
      searchPanel(q)
        .then((result) => live && setAnswer({ q, result }))
        .catch(() => live && setAnswer({ q, result: null }))
    }, DELAY_MS)
    return () => {
      live = false
      clearTimeout(timer)
    }
  }, [q])
  if (q.length < 2) return { kind: 'idle' }
  if (answer?.q !== q) return { kind: 'loading' }
  return answer.result ? { kind: 'done', result: answer.result } : { kind: 'error' }
}

/** Arrow keys between the result links; Esc back to the field. */
function moveFocus(
  event: KeyboardEvent<HTMLElement>,
  list: HTMLElement | null,
  input: HTMLInputElement | null,
) {
  if (!list) return
  const links = [...list.querySelectorAll<HTMLAnchorElement>('a')]
  const at = links.indexOf(document.activeElement as HTMLAnchorElement)
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    links[Math.min(links.length - 1, at + 1)]?.focus()
  } else if (event.key === 'ArrowUp' && at >= 0) {
    // Only between the links: in the field ArrowUp keeps moving the caret.
    event.preventDefault()
    if (at <= 0) input?.focus()
    else links[at - 1]?.focus()
  }
}

/**
 * The panel search (panel spec §2, §2a pt 2, P8): on a computer a field in the top bar (Ctrl K)
 * with results under it; on a phone a magnifier in the app bar opening a full-screen search.
 * Admin only (the shell renders it for the admin). The text goes by POST (server action) — never
 * into the address, history or logs.
 */
export function PanelSearch({ admin, mode }: { admin: string; mode: 'bar' | 'phone' }) {
  return mode === 'bar' ? <SearchBar admin={admin} /> : <SearchScreen admin={admin} />
}

function SearchBar({ admin }: { admin: string }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const state = useSearch(query)
  const input = useRef<HTMLInputElement>(null)
  const list = useRef<HTMLDivElement>(null)
  const box = useRef<HTMLDivElement>(null)
  const listId = useId()

  // Ctrl K / ⌘K from anywhere in the panel.
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        input.current?.focus()
        input.current?.select()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const shown = open && query.trim().length >= 2
  return (
    <div
      ref={box}
      className="pn-search"
      role="search"
      onBlur={(e) => {
        if (!box.current?.contains(e.relatedTarget as Node | null)) setOpen(false)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && shown) {
          e.preventDefault()
          setOpen(false)
          input.current?.focus()
        } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          moveFocus(e, list.current, input.current)
        }
      }}
    >
      <label className="pn-srch">
        <Icon name="search" size={16} />
        <input
          ref={input}
          type="search"
          placeholder={PLACEHOLDER}
          aria-label={LABEL}
          aria-controls={listId}
          autoComplete="off"
          enterKeyHint="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
        />
        <kbd aria-hidden="true">Ctrl K</kbd>
      </label>
      <div ref={list} id={listId} className="pn-search__pop" hidden={!shown}>
        {shown ? <Results state={state} admin={admin} /> : null}
      </div>
    </div>
  )
}

function SearchScreen({ admin }: { admin: string }) {
  const [query, setQuery] = useState('')
  const state = useSearch(query)
  const dialog = useRef<HTMLDialogElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const list = useRef<HTMLDivElement>(null)

  const close = () => dialog.current?.close()
  return (
    <>
      <button
        type="button"
        className="pn-icb"
        aria-label={LABEL}
        aria-haspopup="dialog"
        onClick={() => {
          dialog.current?.showModal()
          input.current?.focus()
        }}
      >
        <Icon name="search" size={20} />
      </button>
      <dialog
        ref={dialog}
        className="pn-searchdlg"
        aria-label={LABEL}
        onKeyDown={(e) => moveFocus(e, list.current, input.current)}
      >
        <div className="pn-searchdlg__hd" role="search">
          <label className="pn-srch">
            <Icon name="search" size={18} />
            <input
              ref={input}
              type="search"
              placeholder={PLACEHOLDER}
              aria-label={LABEL}
              autoComplete="off"
              enterKeyHint="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <button type="button" className="pn-link" onClick={close}>
            Anuluj
          </button>
        </div>
        <div ref={list} className="pn-searchdlg__body">
          <Results state={state} admin={admin} />
        </div>
      </dialog>
    </>
  )
}

// TODO(krystian): texts of the search states and group names — not on the boards.
function Results({ state, admin }: { state: State; admin: string }) {
  if (state.kind === 'idle') {
    return <p className="pn-search__note">Wpisz numer zapytania, imię, zestaw, część albo kod.</p>
  }
  if (state.kind === 'loading') {
    return (
      <p className="pn-search__note" role="status">
        Szukam…
      </p>
    )
  }
  if (state.kind === 'error') {
    return (
      <p className="pn-search__note" role="status">
        Nie udało się wyszukać. Spróbuj ponownie.
      </p>
    )
  }
  const r = state.result
  const total = r.inquiries.length + r.builds.length + r.options.length + r.parts.length
  if (total === 0) {
    return (
      <p className="pn-search__note" role="status">
        Nic nie znaleziono.
      </p>
    )
  }
  return (
    <>
      <p className="pn-sr" role="status">
        Wyniki: {total}
      </p>
      <Group title="Zapytania">
        {r.inquiries.map((i) => (
          <Hit
            key={i.number}
            href={`${admin}/zapytania?nr=${encodeURIComponent(i.number)}`}
            title={`${i.name} · ${i.topic}`}
            detail={i.number}
          />
        ))}
      </Group>
      <Group title="Zestawy">
        {r.builds.map((b) => (
          <Hit key={b.slug} href={`${admin}/zestawy/${b.slug}`} title={b.name} />
        ))}
      </Group>
      <Group title="Opcje konfiguratora">
        {r.options.map((o) => (
          <Hit
            key={o.id}
            href={`${admin}/collections/options/${o.id}`}
            title={o.label}
            detail={o.detail}
          />
        ))}
      </Group>
      <Group title="Części poziomów mocy">
        {r.parts.map((p) => (
          <Hit
            key={p.label}
            href={`${admin}/collections/power-levels/${p.levelId}`}
            title={p.label}
            detail={p.detail}
          />
        ))}
      </Group>
    </>
  )
}

function Group({ title, children }: { title: string; children: ReactNode[] }) {
  if (children.length === 0) return null
  return (
    <section className="pn-search__group">
      <h3>{title}</h3>
      <ul>{children}</ul>
    </section>
  )
}

function Hit({ href, title, detail }: { href: string; title: string; detail?: string }) {
  return (
    <li>
      <a href={href}>
        <span>{title}</span>
        {detail ? <small>{detail}</small> : null}
      </a>
    </li>
  )
}
