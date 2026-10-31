'use client'

import { useRouter } from 'next/navigation'
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
  type FormEvent,
} from 'react'

import { placeholdersIn } from '../../lib/inquiry/templates'
import type { InquiryStatus } from '../../lib/inquiry/types'
import { Icon } from '../ui/icons'
import { Seg } from '../ui/Seg'
import {
  addNote,
  convertToOrder,
  searchInquiries,
  sendReply,
  setStatus,
  type ActionResult,
  type SearchHit,
} from './actions'
import { STATUS_CHIP, STATUS_SWITCH } from './format'
import type { ReplyTemplateView } from './load'

/**
 * Interactive parts of /admin/zapytania: reply box, status switch, the right column's actions and
 * the search. Every change goes through a server action that checks the role; afterwards the
 * page reloads its data from the server (`router.refresh()`), so the thread is never stale.
 */

const noop = () => () => {}
/** false in the server HTML, true once hydrated: buttons before that would do nothing. */
const useHydrated = () =>
  useSyncExternalStore(
    noop,
    () => true,
    () => false,
  )

function Status({
  result,
  pending,
  busy,
}: {
  result: ActionResult | null
  pending: boolean
  busy: string
}) {
  return (
    <p className="pn-formstatus" role="status" aria-live="polite">
      {pending ? busy : result ? result.message : ''}
    </p>
  )
}

export function ReplyBox({
  inquiryId,
  templates,
  from,
  toMasked,
  priceChanged,
}: {
  inquiryId: number
  templates: ReplyTemplateView[]
  from: string
  toMasked: string
  priceChanged: { at: string; today: string } | null
}) {
  const router = useRouter()
  const [draft, setDraft] = useState('')
  const [template, setTemplate] = useState<ReplyTemplateView | null>(null)
  const [result, setResult] = useState<ActionResult | null>(null)
  const [pending, startTransition] = useTransition()
  const [busy, setBusy] = useState('')
  const area = useRef<HTMLTextAreaElement>(null)
  const ready = useHydrated()
  const left = placeholdersIn(draft)

  function pick(t: ReplyTemplateView) {
    setDraft(t.text)
    setTemplate(t)
    setResult(null)
    area.current?.focus()
  }

  function run(kind: 'reply' | 'note') {
    if (pending) return
    // TODO(krystian): texts „Wysyłam…”, „Zapisuję…” — not on the board.
    setBusy(kind === 'reply' ? 'Wysyłam…' : 'Zapisuję notatkę…')
    startTransition(async () => {
      const next =
        kind === 'reply'
          ? await sendReply({ inquiryId, body: draft, templateId: template?.id ?? null })
          : await addNote({ inquiryId, body: draft })
      setResult(next)
      if (next.ok) {
        setDraft('')
        setTemplate(null)
        router.refresh()
      }
    })
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    run('reply')
  }

  return (
    <form
      className="pn-cmp"
      onSubmit={onSubmit}
      aria-label="Odpowiedź klientowi"
      data-ready={ready || undefined}
    >
      {templates.length > 0 ? (
        <div className="pn-cmp__tpl">
          <span className="pn-cmp__tl">Szablony:</span>
          {templates.map((t) => (
            <button
              key={t.id}
              type="button"
              className="pn-fpill"
              aria-pressed={template?.id === t.id}
              disabled={!ready}
              onClick={() => pick(t)}
            >
              {t.name}
            </button>
          ))}
        </div>
      ) : null}
      {template?.kind === 'offer' && priceChanged ? (
        // TODO(krystian): text — not on the board (decision 31.10: today's price in the offer).
        <p className="pn-cmp__warn">
          Cena zmieniła się od zapytania: klient widział {priceChanged.at}, dziś{' '}
          {priceChanged.today}. W ofercie jest cena dziś.
        </p>
      ) : null}
      {left.length > 0 ? (
        <p className="pn-cmp__warn" id="reply-missing">
          Uzupełnij przed wysłaniem: {left.map((v) => `{${v}}`).join(', ')}
          {left.includes('cena')
            ? ' — brak dzisiejszej ceny (część wypadła z oferty albo nie ma partii cen).'
            : '.'}
        </p>
      ) : null}
      <label htmlFor="pn-reply" className="pn-sr">
        Odpowiedź
      </label>
      <textarea
        id="pn-reply"
        ref={area}
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value)
          if (e.target.value === '') setTemplate(null)
        }}
        rows={5}
        enterKeyHint="send"
        placeholder="Napisz odpowiedź… Klient dostanie ją e-mailem z numerem zapytania w temacie."
        aria-describedby={left.length > 0 ? 'reply-missing' : undefined}
      />
      <div className="pn-cmp__row">
        <button
          type="button"
          className="pn-btn pn-btn--quiet"
          disabled={pending || draft.trim() === ''}
          onClick={() => run('note')}
        >
          <Icon name="note" size={17} />
          Notatka wewnętrzna
        </button>
        <span className="pn-cmp__to">
          wyśle: {from} → {toMasked}
        </span>
        <button
          type="submit"
          className="pn-btn pn-btn--gold"
          disabled={pending || draft.trim() === '' || left.length > 0}
        >
          <Icon name="send" size={17} />
          Wyślij
        </button>
      </div>
      <Status result={result} pending={pending} busy={busy} />
    </form>
  )
}

export function StatusSwitch({ inquiryId, status }: { inquiryId: number; status: InquiryStatus }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [result, setResult] = useState<ActionResult | null>(null)
  // A finished inquiry („Bez zakupu”, „Zamknięte”) shows its own segment, so the group keeps a
  // checked option (and a tab stop).
  const options: { value: InquiryStatus; label: string }[] = [...STATUS_SWITCH]
  if (!options.some((o) => o.value === status)) {
    options.push({ value: status, label: STATUS_CHIP[status].label })
  }

  function change(next: InquiryStatus) {
    if (next === status || pending) return
    startTransition(async () => {
      const r = await setStatus({ inquiryId, status: next })
      setResult(r)
      if (r.ok) router.refresh()
    })
  }

  return (
    <div className="pn-ibm__st">
      <Seg label="Status zapytania" options={options} value={status} onChange={change} />
      {result && !result.ok ? (
        <p className="pn-formstatus" role="status">
          {result.message}
        </p>
      ) : null}
    </div>
  )
}

export function AsideActions({
  inquiryId,
  canConvert,
  canClose,
}: {
  inquiryId: number
  canConvert: boolean
  canClose: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [result, setResult] = useState<ActionResult | null>(null)

  function run(action: () => Promise<ActionResult>) {
    if (pending) return
    startTransition(async () => {
      const r = await action()
      setResult(r)
      if (r.ok) router.refresh()
    })
  }

  return (
    <div className="pn-ibc__acts">
      {canConvert ? (
        <button
          type="button"
          className="pn-btn pn-btn--gold"
          disabled={pending}
          onClick={() => {
            // TODO(krystian): text of the confirmation — not on the board.
            if (window.confirm('Utworzyć zamówienie z tego zapytania (cena dziś)?')) {
              run(() => convertToOrder({ inquiryId }))
            }
          }}
        >
          <Icon name="box" size={17} />
          Zamień w zamówienie
        </button>
      ) : null}
      {canClose ? (
        <button
          type="button"
          className="pn-btn"
          disabled={pending}
          onClick={() => run(() => setStatus({ inquiryId, status: 'lost' }))}
        >
          Oznacz: bez zakupu
        </button>
      ) : null}
      <Status result={result} pending={pending} busy="Zapisuję…" />
    </div>
  )
}

/** Search by number, name or build — POST through an action, the name never in the address. */
export function InboxSearch() {
  const [query, setQuery] = useState('')
  const [found, setFound] = useState<SearchHit[] | null>(null)
  const [pending, startTransition] = useTransition()
  // Under 2 characters the list is not searched (and old hits are not shown).
  const hits = query.trim().length < 2 ? null : found

  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) return
    const timer = setTimeout(() => {
      startTransition(async () => setFound(await searchInquiries(q)))
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  return (
    <div className="pn-isrch">
      <label className="pn-isrch__f">
        <Icon name="search" size={17} />
        <span className="pn-sr">Szukaj zapytań</span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Szukaj: imię, numer, zestaw"
          autoComplete="off"
          enterKeyHint="search"
        />
      </label>
      {hits ? (
        <div
          className="pn-isrch__res"
          role="region"
          aria-label="Wyniki wyszukiwania"
          aria-busy={pending}
        >
          {hits.length === 0 ? (
            // TODO(krystian): text — not on the board.
            <p className="pn-isrch__none">Nic nie znaleziono.</p>
          ) : (
            <ul>
              {hits.map((h) => (
                <li key={h.number}>
                  <a href={`?nr=${encodeURIComponent(h.number)}`}>
                    <b>{h.name}</b>
                    <span>
                      {h.number} · {h.topic} · {STATUS_CHIP[h.status].label}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  )
}
