'use client'

import { useRef, useState, useTransition } from 'react'

import { signedZl, zl } from '../../lib/pricing/format'
import type { OptionType } from '../../lib/pricing/types'
import { Alert } from '../ui/Alert'
import { Icon } from '../ui/icons'
import { addOption, previewOption, type PreviewResult } from './actions'
import styles from './options.module.css'

type Field = {
  name: string
  label: string
  kind: 'text' | 'number' | 'money' | 'select'
  options?: { value: string; label: string }[]
  placeholder?: string
  wide?: boolean
  /** Shown only when this other field has one of the values. */
  when?: { field: string; values: string[] }
}

const CLASS = [
  { value: '1', label: '1 · podstawowa' },
  { value: '2', label: '2 · średnia' },
  { value: '3', label: '3 · wyższa' },
]
const COLOR = [
  { value: 'czarny', label: 'czarna' },
  { value: 'biały', label: 'biała' },
  { value: 'szary', label: 'szara' },
]

const NAME: Field = {
  name: 'publicLabel',
  label: 'Nazwa na stronie (z producentem)',
  kind: 'text',
  placeholder: 'np. Lian Li Lancool 217 czarna',
  wide: true,
}
const MODEL: Field = {
  name: 'internalModel',
  label: 'Model wewnętrzny (do zamówień)',
  kind: 'text',
  placeholder: 'pełna nazwa modelu, np. z faktury',
  wide: true,
}
const COST: Field = { name: 'cost', label: 'Koszt zakupu (zł)', kind: 'money', placeholder: '410' }

const FIELDS: Record<OptionType, Field[]> = {
  case: [
    NAME,
    MODEL,
    { name: 'gpuMaxMm', label: 'Karta do (mm)', kind: 'number', placeholder: '400' },
    { name: 'coolerMaxMm', label: 'Chłodzenie do (mm)', kind: 'number', placeholder: '170' },
    {
      name: 'aio360',
      label: 'AIO 360',
      kind: 'select',
      options: [
        { value: 'front', label: 'przód' },
        { value: 'top_only', label: 'tylko góra' },
        { value: 'side', label: 'bok' },
        { value: 'yes', label: 'tak' },
        { value: 'none', label: 'brak' },
      ],
    },
    { name: 'class', label: 'Klasa', kind: 'select', options: CLASS },
    { name: 'color', label: 'Kolor', kind: 'select', options: COLOR },
    COST,
  ],
  cooler: [
    NAME,
    MODEL,
    {
      name: 'kind',
      label: 'Rodzaj',
      kind: 'select',
      options: [
        { value: 'air', label: 'powietrzne' },
        { value: 'aio360', label: 'AIO 360' },
      ],
    },
    {
      name: 'heightMm',
      label: 'Wysokość (mm)',
      kind: 'number',
      placeholder: '155',
      when: { field: 'kind', values: ['air'] },
    },
    {
      name: 'radiatorThicknessMm',
      label: 'Grubość chłodnicy (mm)',
      kind: 'number',
      placeholder: '27',
      when: { field: 'kind', values: ['aio360'] },
    },
    { name: 'class', label: 'Klasa', kind: 'select', options: CLASS },
    { name: 'color', label: 'Kolor', kind: 'select', options: COLOR },
    COST,
  ],
  ram: [
    NAME,
    MODEL,
    {
      name: 'ramType',
      label: 'Typ pamięci',
      kind: 'select',
      options: [
        { value: 'DDR5', label: 'DDR5' },
        { value: 'DDR4', label: 'DDR4' },
      ],
    },
    { name: 'capacityGb', label: 'Pojemność (GB)', kind: 'number', placeholder: '32' },
    COST,
  ],
  ssd: [
    NAME,
    MODEL,
    { name: 'capacityGb', label: 'Pojemność (GB)', kind: 'number', placeholder: '1000' },
    COST,
  ],
}

const initial = (type: OptionType): Record<string, string> => {
  const values: Record<string, string> = { type }
  for (const f of FIELDS[type]) if (f.kind === 'select') values[f.name] = f.options![0]!.value
  if (type === 'case' || type === 'cooler') values.class = '2'
  return values
}

/**
 * „Nowa obudowa / chłodzenie / RAM / dysk” (panel spec §10, board Opcje): fields of `options`,
 * the price on the site live (`previewOption` → `sellOption`, debounced), offer links and a photo.
 * Saving creates the option switched off — it waits in „Do zatwierdzenia”.
 */
export function AddOption({
  type,
  title,
  onClose,
  onAdded,
  approveHref,
}: {
  type: OptionType
  title: string
  onClose: () => void
  onAdded: (label: string) => void
  approveHref: string
}) {
  const [values, setValues] = useState<Record<string, string>>(() => initial(type))
  const [preview, setPreview] = useState<PreviewResult | null>(null)
  const [errors, setErrors] = useState<string[]>([])
  const [saving, startSave] = useTransition()
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const seq = useRef(0)
  const photo = type === 'case' || type === 'cooler'

  const visible = FIELDS[type].filter(
    (f) => !f.when || f.when.values.includes(values[f.when.field] ?? ''),
  )

  const change = (name: string, value: string) => {
    const next = { ...values, [name]: value }
    setValues(next)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(async () => {
      const id = ++seq.current
      const shown = Object.fromEntries(
        Object.entries(next).filter(
          ([key, v]) => v.trim() !== '' && (key === 'type' || visibleNames(type, next).has(key)),
        ),
      )
      let outcome: PreviewResult
      try {
        outcome = await previewOption(shown)
      } catch {
        outcome = { ok: false, messages: [] }
      }
      if (id === seq.current) setPreview(outcome)
    }, 300)
  }

  const submit = (form: FormData) =>
    startSave(async () => {
      for (const key of [...form.keys()]) {
        if (
          key !== 'links' &&
          key !== 'photo' &&
          key !== 'type' &&
          !visibleNames(type, values).has(key)
        ) {
          form.delete(key)
        }
      }
      const outcome = await addOption(form)
      if (outcome.ok) onAdded(values.publicLabel ?? outcome.code)
      else setErrors(outcome.messages)
    })

  return (
    <section className={`pn-card ${styles.add}`} aria-labelledby="add-option-title">
      <div className={styles.addHead}>
        <h2 id="add-option-title">{title}</h2>
        <button type="button" className="pn-icb" onClick={onClose} aria-label="Zamknij">
          ×
        </button>
      </div>
      <form action={submit}>
        <input type="hidden" name="type" value={type} />
        <div className={styles.addGrid}>
          {visible.map((f) => {
            const id = `add-${f.name}`
            return (
              <div key={f.name} className={`pn-fld ${f.wide ? styles.wide : ''}`}>
                <label htmlFor={id}>{f.label}</label>
                {f.kind === 'select' ? (
                  <select
                    id={id}
                    name={f.name}
                    value={values[f.name] ?? ''}
                    onChange={(e) => change(f.name, e.target.value)}
                  >
                    {f.options!.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    id={id}
                    name={f.name}
                    required
                    value={values[f.name] ?? ''}
                    placeholder={f.placeholder}
                    inputMode={
                      f.kind === 'money' ? 'decimal' : f.kind === 'number' ? 'numeric' : undefined
                    }
                    enterKeyHint="next"
                    autoComplete="off"
                    onChange={(e) => change(f.name, e.target.value)}
                  />
                )}
              </div>
            )
          })}
        </div>

        <div className={styles.addLower}>
          <div className={styles.price} aria-live="polite">
            <Icon name="tag" />
            {preview?.ok ? (
              <span>
                <b>Cena na stronie: {zl(preview.preview.price)}</b>
                <small>
                  {preview.preview.rule}
                  {preview.preview.versus
                    ? ` · względem najtańszej tego rodzaju (${preview.preview.versus.label}): ${signedZl(preview.preview.versus.amount)}`
                    : ''}
                </small>
              </span>
            ) : (
              // TODO(krystian): sentence not on the board.
              <span>
                <b>Cena na stronie: —</b>
                <small>uzupełnij pola i koszt, a cennik policzy cenę</small>
              </span>
            )}
          </div>

          <div className="pn-fld">
            <label htmlFor="add-links">Linki do ofert (do sprawdzania cen)</label>
            <textarea
              id="add-links"
              name="links"
              rows={3}
              placeholder="https://… (jeden link w wierszu, 2–4 sklepy)"
              aria-describedby="add-links-hint"
            />
            <small id="add-links-hint" className={styles.hint}>
              Claude czyta te strony przy każdym sprawdzeniu. Bez linków szuka oferty sam.
            </small>
          </div>

          {photo ? (
            <div className="pn-fld">
              <label htmlFor="add-photo">Zdjęcie bez tła (WebP, PNG)</label>
              <input
                id="add-photo"
                name="photo"
                type="file"
                accept="image/webp,image/png,image/jpeg,image/avif"
              />
            </div>
          ) : null}
        </div>

        {errors.length > 0 ? (
          <Alert title="Nie dodano">
            <ul className={styles.list}>
              {errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          </Alert>
        ) : null}

        <div className={styles.addActions}>
          <a className="pn-link" href={approveHref}>
            Do zatwierdzenia
          </a>
          <button type="button" className="pn-btn" onClick={onClose}>
            Anuluj
          </button>
          <button type="submit" className="pn-btn pn-btn--gold" disabled={saving}>
            {saving ? 'Dodaję…' : 'Dodaj do zatwierdzenia'}
          </button>
        </div>
      </form>
    </section>
  )
}

/** Names of the fields shown for these values (hidden ones are not sent). */
function visibleNames(type: OptionType, values: Record<string, string>): Set<string> {
  return new Set(
    FIELDS[type]
      .filter((f) => !f.when || f.when.values.includes(values[f.when.field] ?? ''))
      .map((f) => f.name),
  )
}
