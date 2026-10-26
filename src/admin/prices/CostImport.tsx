'use client'

import { Banner, Button } from '@payloadcms/ui'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

import type { CostTarget, ImportPreview } from '../../lib/pricing/csv'
import { zl } from '../../lib/pricing/format'
import {
  importCosts,
  previewCosts,
  type CostImportPreviewResult,
  type CostImportResult,
  type MarginCheck,
} from './actions'
import styles from './prices.module.css'

const MATCHED_BY: Record<ImportPreview['changes'][number]['matchedBy'], string> = {
  code: 'kod',
  ean: 'EAN',
  model: 'model części',
}

const CHECK_MESSAGE: Record<MarginCheck, string> = {
  done: 'Marża sprawdzona — jeśli ceny na stronie ją łamią, poszedł alarm mailem. Sprawdź kolejkę niżej.',
  pending:
    'Sprawdzenie marży jest w toku (alarm wyśle się sam, jeśli trzeba) — za chwilę odśwież stronę.',
  failed:
    'Sprawdzenie marży nie powiodło się (szczegóły w logach) — sprawdź strażnika i kolejkę niżej.',
}

const ROLE: Record<string, string> = {
  cpu: 'procesor',
  gpu: 'karta',
  mobo: 'płyta',
  psu: 'zasilacz',
}

const where = (t: CostTarget) =>
  t.kind === 'option' ? `${t.code} (${t.label})` : `${t.levelCode} — ${ROLE[t.role] ?? t.role}`

/**
 * Cost import (ADR-G002 §4.1): paste "kod lub EAN; koszt", see what changes, then save. The server
 * parses the text again on save; costs change, prices do not — they go through the queue.
 */
export function CostImport() {
  const router = useRouter()
  const [text, setText] = useState('')
  const [previewed, setPreviewed] = useState<{
    text: string
    result: CostImportPreviewResult
  } | null>(null)
  const [saved, setSaved] = useState<CostImportResult | null>(null)
  const [pending, startTransition] = useTransition()

  const preview = previewed?.result.ok ? previewed.result.preview : null
  const canSave =
    !pending &&
    previewed?.text === text &&
    preview !== null &&
    preview.errors.length === 0 &&
    preview.changes.length > 0

  const showPreview = () =>
    startTransition(async () => {
      setSaved(null)
      setPreviewed({ text, result: await previewCosts({ text }) })
    })

  const save = () =>
    startTransition(async () => {
      const outcome = await importCosts({ text })
      setSaved(outcome)
      if (outcome.ok) {
        setPreviewed(null)
        setText('')
        router.refresh()
      }
    })

  return (
    <div>
      <label htmlFor="cost-csv" className={styles.label}>
        Wklej z arkusza albo pliku CSV: kod lub EAN; koszt (jeden wiersz = jedna pozycja)
      </label>
      <textarea
        id="cost-csv"
        className={styles.textarea}
        rows={6}
        value={text}
        placeholder={'R16;450\nKRAKEN;1 199,99\n5901234567890;2 049'}
        onChange={(e) => setText(e.target.value)}
        disabled={pending}
        spellCheck={false}
      />
      <div className={styles.actions}>
        <Button
          buttonStyle="secondary"
          onClick={showPreview}
          disabled={pending || text.trim() === ''}
        >
          Pokaż zmiany
        </Button>
        <Button buttonStyle="primary" onClick={save} disabled={!canSave}>
          {pending ? 'Zapisuję…' : 'Zapisz koszty'}
        </Button>
        <span className={styles.hint}>
          Zapis zmienia koszty, nie ceny — nowe ceny trafią do kolejki niżej.
        </span>
      </div>

      <div aria-live="polite">
        {previewed && !previewed.result.ok && (
          <Banner type="error">{previewed.result.messages.join(' ')}</Banner>
        )}
        {preview && (
          <>
            <p className={styles.hint}>
              {preview.changes.length} zmian, {preview.unchanged} bez zmian, {preview.errors.length}{' '}
              błędnych wierszy.
              {previewed?.text !== text &&
                ' Tekst zmienił się od podglądu — pokaż zmiany jeszcze raz.'}
            </p>
            {preview.errors.length > 0 && (
              <Banner type="error">
                <strong>Te wiersze trzeba poprawić — bez tego nic nie zapiszemy:</strong>
                <ul className={styles.problems}>
                  {preview.errors.map((e) => (
                    <li key={`${e.line}-${e.message}`}>
                      {e.line > 0 ? `Wiersz ${e.line} („${e.text}”): ` : ''}
                      {e.message}
                    </li>
                  ))}
                </ul>
              </Banner>
            )}
            {preview.changes.length > 0 && (
              <div
                className={styles.tableWrap}
                role="region"
                aria-label="Zmiany kosztów z importu"
                tabIndex={0}
              >
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th scope="col">Wiersz</th>
                      <th scope="col">Kod / EAN / model</th>
                      <th scope="col">Rozpoznane po</th>
                      <th scope="col">Gdzie</th>
                      <th scope="col">Koszt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.changes.map((c) => (
                      <tr key={c.line}>
                        <td>{c.line}</td>
                        <td>{c.key}</td>
                        <td>{MATCHED_BY[c.matchedBy]}</td>
                        <td>{c.targets.map(where).join(', ')}</td>
                        <td>
                          {[...new Set(c.targets.map((t) => zl(t.oldCost)))].join(' / ')} →{' '}
                          {zl(c.newCost)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
        {saved?.ok === true && (
          <Banner type="success">
            Zapisano koszty: {saved.options} opcji, {saved.levels} poziomów mocy.{' '}
            {CHECK_MESSAGE[saved.check]}
          </Banner>
        )}
        {saved?.ok === false && (
          <Banner type="error">
            <ul className={styles.problems}>
              {saved.messages.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </Banner>
        )}
      </div>
    </div>
  )
}
