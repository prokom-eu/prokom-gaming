'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

import { optionStates, repairConfig, switchLevel } from '../../lib/configurator'
import { marginStatus, percentShort, signedZl, zl } from '../../lib/pricing/format'
import { recipeFigures } from '../../lib/pricing/recipe'
import { lookupPrice } from '../../lib/pricing/snapshot'
import type { Config, OptionType } from '../../lib/pricing/types'
import { ActionBar } from '../ui/ActionBar'
import { Alert } from '../ui/Alert'
import { Card } from '../ui/Card'
import { Chip } from '../ui/Chip'
import { Icon } from '../ui/icons'
import { MarginBar } from '../ui/MarginBar'
import { Seg } from '../ui/Seg'
import { Sheet } from '../ui/Sheet'
import { saveBuild, type SaveBuildResult } from './actions'
import type { EditorData } from './editor'
import type { OfferStatus } from './load'
import styles from './builds.module.css'

type Tab = 'recipe' | 'content' | 'history'

const STATUSES: { value: OfferStatus; label: string }[] = [
  { value: 'published', label: 'Na stronie' },
  { value: 'draft', label: 'Szkic' },
  { value: 'hidden', label: 'Ukryty' },
]

const TABS: { value: Tab; label: string }[] = [
  { value: 'recipe', label: 'Przepis' },
  { value: 'content', label: 'Treść i zdjęcia' },
  { value: 'history', label: 'Historia ceny' },
]

const SLOT_TITLE: Record<OptionType, string> = {
  case: 'Obudowa',
  cooler: 'Chłodzenie',
  ram: 'RAM',
  ssd: 'Dysk',
}

const same = (a: Config, b: Config) =>
  a.level === b.level &&
  a.case === b.case &&
  a.cooler === b.cooler &&
  a.ram === b.ram &&
  a.ssd === b.ssd

/**
 * The build editor in the browser (panel spec §9): the recipe greyed out with the configurator's
 * own rules (`optionStates`, `lib/compat`), the price and margins live from `lib/pricing`
 * (`recipeFigures`), „Zapisz” asks to confirm a new price on the site. The server checks all of
 * it again on saving.
 */
export function EditorBoard({
  data,
  competitor = null,
}: {
  data: EditorData
  /** Competitor's price typed in the settings (P7). */
  competitor?: { name: string; price: number; date: string } | null
}) {
  const router = useRouter()
  const { build, prices, costsToday, costsAtBatch, minMargin, warnMargin } = data
  const [config, setConfig] = useState<Config>(build.config)
  const [status, setStatus] = useState<OfferStatus>(build.status)
  const [tab, setTab] = useState<Tab>('recipe')
  const [confirm, setConfirm] = useState<{ from: number | null; to: number } | null>(null)
  const [result, setResult] = useState<SaveBuildResult | null>(null)
  // TODO(krystian): message not on the board.
  const [levelNote, setLevelNote] = useState<string | null>(null)
  const [saving, startSave] = useTransition()

  const atBatch = recipeFigures(config, prices, costsAtBatch)
  const today = recipeFigures(config, prices, costsToday)
  const onSite = recipeFigures(build.config, prices, costsToday).price
  const price = today.price
  const change = price !== null && onSite !== null ? price - onSite : null
  const recipeOf = data.builds.find((b) => same(b.config, config))
  const dirty = !same(config, build.config) || status !== build.status
  const label = (code: string) => data.options.find((o) => o.code === code)?.label ?? code
  const tone = marginStatus(atBatch.margin, minMargin, warnMargin)
  // An item without a published price blocks only a build that will be on the site (saveRule).
  const blocked = price === null && status === 'published'
  // The outcome of „Zapisz” also in the bar under the thumb: on a phone the price card is below.
  const outcomeNote =
    result?.ok === true
      ? 'Zapisano zestaw.'
      : result?.ok === false && 'messages' in result
        ? `Nie zapisano: ${result.messages[0] ?? ''}`
        : blocked
          ? 'pozycja bez opublikowanej ceny'
          : null

  const pickLevel = (code: string) => {
    const next =
      switchLevel(config, code, { offer: data.offer, builds: data.builds, prices }) ??
      repairConfig({ ...config, level: code }, data.offer, prices)
    if (next) setConfig(next.config)
    setLevelNote(
      next ? null : 'Do tego poziomu nie da się dobrać pasujących części — poziom bez zmian.',
    )
    setResult(null)
  }
  const pick = (slot: OptionType, code: string) => {
    setConfig((c) => ({ ...c, [slot]: code }))
    setResult(null)
  }

  const save = (confirmedPrice: number | null) =>
    startSave(async () => {
      const outcome = await saveBuild({ slug: build.slug, config, status, confirmedPrice })
      if (!outcome.ok && 'confirm' in outcome) {
        setConfirm(outcome.confirm)
        return
      }
      setConfirm(null)
      setResult(outcome)
      if (outcome.ok) router.refresh()
    })

  const saveButton = (
    <button
      type="button"
      className="pn-btn pn-btn--gold"
      onClick={() => save(null)}
      disabled={!dirty || saving || blocked}
    >
      <Icon name="check" />
      {saving ? 'Zapisuję…' : 'Zapisz'}
    </button>
  )

  return (
    <>
      <header className={styles.edHead}>
        <span className={styles.sigilBox}>
          <span
            className="pn-sigil"
            aria-hidden="true"
            style={{
              ['--sigil' as string]: `url(/sigils/${build.sigil}-plain.svg)`,
              color: `var(--c-${build.slug}, var(--p-gold))`,
            }}
          />
        </span>
        <div>
          <h1 className={styles.edName}>{build.name}</h1>
          <p className={styles.mu}>
            /zestawy/{build.slug} · {build.tier} · ostatnia zmiana {build.updatedAt}
          </p>
        </div>
        <div className={styles.edStatus}>
          <Seg
            label="Status zestawu"
            options={STATUSES}
            value={status}
            onChange={(next) => {
              setStatus(next)
              setResult(null)
            }}
          />
        </div>
      </header>

      <div className={styles.edTabs}>
        <Seg label="Sekcja edytora" options={TABS} value={tab} onChange={setTab} />
      </div>

      <div className={styles.edGrid}>
        <div className={styles.edMain}>
          {tab === 'recipe' ? (
            <>
              <Card title="Poziom mocy" note="procesor, karta, płyta i zasilacz w jednym pakiecie">
                <div className="pn-fld">
                  <label htmlFor="ed-level">Poziom</label>
                  <select
                    id="ed-level"
                    value={config.level}
                    onChange={(e) => pickLevel(e.target.value)}
                  >
                    {data.levels.map((l) => (
                      <option key={l.code} value={l.code}>
                        {l.title} · {zl(lookupPrice(prices.level, l.code) ?? null)}
                      </option>
                    ))}
                  </select>
                </div>
                <p className={styles.hint}>
                  {data.levels.find((l) => l.code === config.level)?.detail}
                </p>
                {levelNote ? (
                  <p className={styles.hint} role="status">
                    {levelNote}
                  </p>
                ) : null}
              </Card>

              {(['case', 'cooler', 'ram', 'ssd'] as const).map((slot) => {
                const states = optionStates(slot, config, data.offer, prices)
                const fit = states.filter((s) => !s.disabled).length
                const tiles = slot === 'case' || slot === 'cooler'
                return (
                  <Card
                    key={slot}
                    title={SLOT_TITLE[slot]}
                    note={`${fit} z ${states.length} pasuje do tego poziomu`}
                  >
                    <div
                      className={tiles ? styles.tiles : styles.choices}
                      role="radiogroup"
                      aria-label={SLOT_TITLE[slot]}
                    >
                      {states.map((s) => {
                        const option = data.options.find((o) => o.code === s.code)
                        return (
                          <button
                            key={s.code}
                            type="button"
                            role="radio"
                            aria-checked={s.selected}
                            aria-disabled={s.disabled || undefined}
                            className={tiles ? styles.tile : styles.choice}
                            onClick={() => !s.disabled && pick(slot, s.code)}
                          >
                            {tiles ? (
                              <span className={styles.photo}>
                                {option?.photo ? (
                                  <Image
                                    src={option.photo.src}
                                    alt=""
                                    width={120}
                                    height={136}
                                    sizes="120px"
                                  />
                                ) : null}
                              </span>
                            ) : null}
                            <b>{option?.label ?? s.code}</b>
                            <small className={s.disabled ? styles.reason : styles.extra}>
                              {s.disabled
                                ? s.reason
                                : s.selected
                                  ? 'wybrane'
                                  : signedZl(s.surcharge)}
                            </small>
                          </button>
                        )
                      })}
                    </div>
                  </Card>
                )
              })}
            </>
          ) : null}

          {tab === 'content' ? (
            <Card
              title="Treść i zdjęcia"
              actions={
                <a className="pn-btn pn-btn--sm" href={build.editHref}>
                  <Icon name="note" />
                  Edytuj treść
                </a>
              }
            >
              <dl className="pn-kv">
                <dt>Przydomek</dt>
                <dd>{build.texts.epithet || '—'}</dd>
                <dt>Krótko</dt>
                <dd>{build.texts.short || '—'}</dd>
                <dt>Dlaczego ta istota</dt>
                <dd>{build.texts.why || '—'}</dd>
              </dl>
              {build.photos.length > 0 ? (
                <div className={styles.photos}>
                  {build.photos.map((p) => (
                    <Image
                      key={p.src}
                      src={p.src}
                      alt={p.alt}
                      width={160}
                      height={160}
                      sizes="160px"
                    />
                  ))}
                </div>
              ) : (
                // TODO(krystian): sentence not on the board (spec §9: placeholder photo).
                <p className={styles.hint}>
                  Brak zdjęć egzemplarza — strona pokazuje zdjęcie poglądowe obudowy.
                </p>
              )}
            </Card>
          ) : null}

          {tab === 'history' ? (
            <Card title="Historia ceny" note="suma cen pozycji w kolejnych partiach">
              <ul className={styles.history}>
                {data.history.map((h, i) => {
                  const prev = data.history[i + 1]?.price ?? null
                  const diff = h.price !== null && prev !== null ? h.price - prev : null
                  return (
                    <li key={h.label}>
                      <span>
                        <b>{h.label}</b>
                        {h.date ? <small>{h.date}</small> : null}
                      </span>
                      <b>{zl(h.price)}</b>
                      <small>{diff !== null && diff !== 0 ? signedZl(diff) : ''}</small>
                    </li>
                  )
                })}
              </ul>
            </Card>
          ) : null}
        </div>

        <aside className={styles.edSide}>
          <Card
            title="Cena zestawu"
            actions={recipeOf ? <Chip tone="ok">przepis: {recipeOf.name}</Chip> : undefined}
          >
            <p className={styles.edPrice}>
              <b>{zl(price)}</b>
              <small>{change === null || change === 0 ? 'bez zmiany' : signedZl(change)}</small>
            </p>
            <p className={styles.hint}>
              {build.status === 'published'
                ? `na stronie dziś ${zl(onSite)}`
                : 'nie ma go na stronie'}
            </p>
            <dl className={`pn-kv ${styles.breakdown}`}>
              <dt>Poziom mocy</dt>
              <dd>{zl(lookupPrice(prices.level, config.level) ?? null)}</dd>
              {(['case', 'cooler', 'ram', 'ssd'] as const).map((slot) => (
                <FragmentRow
                  key={slot}
                  label={SLOT_TITLE[slot]}
                  value={zl(lookupPrice(prices.option, config[slot]) ?? null)}
                  title={label(config[slot])}
                />
              ))}
              <dt>Usługa (Windows, wysyłka)</dt>
              <dd>{zl(prices.service)}</dd>
            </dl>
            <dl className={`pn-kv ${styles.breakdown}`}>
              <dt>Koszt części i usługi</dt>
              <dd>{zl(today.cost)}</dd>
              <dt>Marża</dt>
              <dd style={tone !== 'ok' ? { color: `var(--p-${tone})` } : undefined}>
                {percentShort(atBatch.margin)}
              </dd>
              <dt>Marża przy dzisiejszych kosztach</dt>
              <dd>{percentShort(today.margin)}</dd>
            </dl>
            <div className={styles.bar2}>
              <MarginBar margin={atBatch.margin} minMargin={minMargin} warnMargin={warnMargin} />
            </div>
            <p className={styles.hint}>linia = minimum {percentShort(minMargin)}</p>
            {blocked ? (
              // TODO(krystian): message not on the board.
              <Alert title="Pozycja bez opublikowanej ceny">
                Zatwierdź ją najpierw w „Do zatwierdzenia” albo zapisz zestaw jako szkic.
              </Alert>
            ) : null}
            <div className={styles.edSave}>{saveButton}</div>
            <div aria-live="polite">
              {result?.ok === true ? <Alert tone="ok" title="Zapisano zestaw." /> : null}
              {result?.ok === false && 'messages' in result ? (
                <Alert title="Nie zapisano">
                  <ul className={styles.list}>
                    {result.messages.map((m) => (
                      <li key={m}>{m}</li>
                    ))}
                  </ul>
                </Alert>
              ) : null}
            </div>
          </Card>
          {competitor ? (
            <Card title="Konkurencja">
              <dl className={`pn-kv ${styles.breakdown}`}>
                <dt>
                  {competitor.name} ({competitor.date})
                </dt>
                <dd>{zl(competitor.price)}</dd>
                <dt>My vs {competitor.name.split(' ')[0]}</dt>
                <dd>{price === null ? '—' : signedZl(price - competitor.price)}</dd>
              </dl>
            </Card>
          ) : null}
        </aside>
      </div>

      <ActionBar
        value={zl(price)}
        note={
          outcomeNote ??
          `marża ${percentShort(atBatch.margin)} · dziś ${percentShort(today.margin)}`
        }
        tone={tone}
      >
        {saveButton}
      </ActionBar>

      <Sheet open={confirm !== null} onClose={() => setConfirm(null)} label="Potwierdź cenę">
        {confirm ? (
          <div className={styles.confirm}>
            <h2>Cena na stronie</h2>
            <p className={styles.confirmPrice}>
              {confirm.from === null ? 'zestaw pojawi się na stronie' : zl(confirm.from)} →{' '}
              <b>{zl(confirm.to)}</b>
            </p>
            {/* TODO(krystian): sentence not on the board. */}
            <p className={styles.hint}>
              Zestaw nie przechodzi przez kolejkę: cena to suma zatwierdzonych cen pozycji, więc
              zmieni się na stronie od razu po zapisie.
            </p>
            <div className={styles.confirmActions}>
              <button type="button" className="pn-btn" onClick={() => setConfirm(null)}>
                Anuluj
              </button>
              <button
                type="button"
                className="pn-btn pn-btn--gold"
                onClick={() => save(confirm.to)}
                disabled={saving}
              >
                Zapisz z ceną {zl(confirm.to)}
              </button>
            </div>
          </div>
        ) : null}
      </Sheet>
    </>
  )
}

function FragmentRow({ label, value, title }: { label: string; value: string; title: string }) {
  return (
    <>
      <dt title={title}>{label}</dt>
      <dd>{value}</dd>
    </>
  )
}
