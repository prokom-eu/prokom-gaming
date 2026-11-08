'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react'

import { track } from '@/lib/analytics'
import { buildHref, routes } from '@/lib/nav'
import { zl } from '@/lib/pricing/format'
import { isEmpty, popular, prepareSearch, searchSite } from '@/lib/search/match'
import type { SearchBuild, SearchGame, SearchIndex, SearchPage } from '@/lib/search/searchIndex'

import './search.css'

/** The index is fetched once per page load, on the first open (NAWIGACJA §5.1). */
let indexPromise: Promise<SearchIndex> | null = null
function loadIndex(): Promise<SearchIndex> {
  indexPromise ??= fetch('/api/szukaj/indeks')
    .then((r) => (r.ok ? (r.json() as Promise<SearchIndex>) : Promise.reject(new Error('index'))))
    .catch((error: unknown) => {
      indexPromise = null
      throw error
    })
  return indexPromise
}

type Option = {
  id: string
  kind: 'build' | 'game' | 'page' | 'none'
  href: string
  /** Shift+Enter: a game opens „Dobór pod grę” instead of its page. */
  alt?: string
  label: string
  note: string
  color?: string
}
type Group = { title: string; options: Option[] }

const buildOption = (b: SearchBuild): Option => ({
  id: `b-${b.slug}`,
  kind: 'build',
  href: buildHref(b.slug),
  label: b.name,
  note: [b.tier, b.resolution, b.price !== null ? `od ${zl(b.price)}` : null]
    .filter(Boolean)
    .join(' · '),
  color: `var(--c-${b.slug})`,
})
const gameOption = (g: SearchGame): Option => ({
  id: `g-${g.slug}`,
  kind: 'game',
  href: `/komputer-do/${g.slug}`,
  alt: `${routes.gamePicker}?gra=${g.slug}`,
  label: g.name,
  note: 'Komputer do tej gry ↵ · dobór ⇧↵',
})
const pageOption = (p: SearchPage): Option => ({
  id: `p-${p.href}`,
  kind: 'page',
  href: p.href,
  label: p.title,
  note: p.text,
})

/**
 * Search dialog (NAWIGACJA §5.3, plansza 10 sekcja 4): a native modal dialog — focus trapped
 * inside, Esc closes, focus returns to the opener. Groups GRY / ZESTAWY (or „Zestawy pod {grę}”)
 * / STRONY, at most 5 each; „Popularne” without a query; „Zapytaj” when nothing matches.
 * On a phone the same dialog is a full-height sheet (CSS).
 */
export function SearchDialog({ onClose }: { onClose: () => void }) {
  const router = useRouter()
  const dialog = useRef<HTMLDialogElement>(null)
  const listId = useId()
  const [index, setIndex] = useState<SearchIndex | null>(null)
  const [failed, setFailed] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)

  useEffect(() => {
    const el = dialog.current
    if (el && !el.open) el.showModal()
    track('search_open')
    loadIndex().then(setIndex, () => setFailed(true))
  }, [])

  const prepared = useMemo(() => (index ? prepareSearch(index) : null), [index])

  const groups: Group[] = useMemo(() => {
    if (!index || !prepared) return []
    const result = searchSite(prepared, query)
    if (!result) {
      const pop = popular(index)
      return [
        { title: 'Popularne gry', options: pop.games.map(gameOption) },
        { title: 'Popularne zestawy', options: pop.builds.map(buildOption) },
      ]
    }
    if (isEmpty(result)) {
      return [
        {
          title: 'Brak wyników',
          options: [
            {
              id: 'none',
              kind: 'none',
              href: routes.inquiry,
              label: 'Nie mamy tego w bazie — zapytaj, a dobierzemy zestaw',
              note: 'Zapytanie ↵',
            },
          ],
        },
      ]
    }
    return [
      { title: 'Gry', options: result.games.map(gameOption) },
      {
        title: result.buildsFor ? `Zestawy pod ${result.buildsFor.name}` : 'Zestawy',
        options: result.builds.map(buildOption),
      },
      { title: 'Strony', options: result.pages.map(pageOption) },
    ].filter((g) => g.options.length > 0)
  }, [index, prepared, query])

  const options = groups.flatMap((g) => g.options)
  const current = options[Math.min(active, options.length - 1)]

  const go = (option: Option, alt = false) => {
    track('search_select', { kind: option.kind })
    dialog.current?.close()
    router.push(alt && option.alt ? option.alt : option.href)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      if (options.length === 0) return
      const step = event.key === 'ArrowDown' ? 1 : -1
      setActive((i) => (Math.min(i, options.length - 1) + step + options.length) % options.length)
    } else if (event.key === 'Enter' && current) {
      event.preventDefault()
      go(current, event.shiftKey)
    }
  }

  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)

  return (
    <dialog
      ref={dialog}
      className="sd"
      aria-label="Szukaj"
      onClose={onClose}
      // A click on the dimmed backdrop (the dialog element itself, outside its panel) closes it.
      onClick={(event) => {
        if (event.target === event.currentTarget) event.currentTarget.close()
      }}
    >
      <div className="sd__panel">
        <div className="sd__field">
          <svg className="sd__lupa" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <circle cx="11" cy="11" r="6.5" />
            <path d="M20 20l-4.2-4.2" />
          </svg>
          <input
            // The dialog opens on purpose: the field takes the focus (keyboard on a phone).
            autoFocus
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setActive(0)
            }}
            onKeyDown={onKeyDown}
            placeholder="Szukaj istoty, gry albo strony…"
            aria-label="Szukaj istoty, gry albo strony"
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-activedescendant={current ? `${listId}-${current.id}` : undefined}
            autoComplete="off"
            enterKeyHint="go"
          />
          <button type="button" className="sd__esc" onClick={() => dialog.current?.close()}>
            <span aria-hidden="true">Esc</span>
            <span className="sr-only">Zamknij wyszukiwanie</span>
          </button>
        </div>

        <div className="sd__body">
          {failed && (
            <p className="sd__state">
              Wyszukiwarka jest chwilowo niedostępna.{' '}
              <a className="lnk" href={routes.builds}>
                Zobacz wszystkie zestawy
              </a>
            </p>
          )}
          {!index && !failed && <p className="sd__state">Wczytujemy…</p>}
          <ul id={listId} role="listbox" aria-label="Wyniki wyszukiwania" className="sd__list">
            {groups.map((group) => (
              <li key={group.title} role="presentation">
                <p className="sd__group" aria-hidden="true">
                  {group.title}
                </p>
                <ul role="group" aria-label={group.title}>
                  {group.options.map((option) => (
                    <li
                      key={option.id}
                      id={`${listId}-${option.id}`}
                      role="option"
                      aria-selected={option === current}
                      className="sd__opt"
                      onMouseEnter={() => setActive(options.indexOf(option))}
                      onClick={() => go(option)}
                    >
                      <span
                        className={option.color ? 'sd__dot sd__dot--build' : 'sd__dot'}
                        style={option.color ? { ['--c' as string]: option.color } : undefined}
                        aria-hidden="true"
                      />
                      <span className={option.kind === 'build' ? 'sd__name nm' : 'sd__name'}>
                        {option.label}
                      </span>
                      <span className="sd__note">{option.note}</span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </div>
        <p className="sd__keys" aria-hidden="true">
          <kbd>↑</kbd>
          <kbd>↓</kbd> wybór · <kbd>↵</kbd> otwórz · <kbd>Esc</kbd> zamknij ·{' '}
          <kbd>{isMac ? '⌘K' : 'Ctrl K'}</kbd> szukaj
        </p>
      </div>
    </dialog>
  )
}
