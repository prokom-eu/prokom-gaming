'use client'

import { Banner, Button } from '@payloadcms/ui'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

import type { QueueItem } from '../../lib/pricing/publish'
import { publishPrices, type PublishResult } from './actions'
import { percent, signedZl, zl } from '../../lib/pricing/format'
import styles from './prices.module.css'

const TYPE_LABEL: Record<QueueItem['itemType'], string> = {
  level: 'Poziom mocy',
  option: 'Opcja',
  service: 'Usługa',
}

const REASON_LABEL: Record<QueueItem['reasons'][number], string> = {
  urgent: 'pilne — obecna cena łamie marżę',
  new: 'nowa pozycja',
  threshold: 'zmiana ponad próg',
}

const urgentKeys = (items: QueueItem[]) =>
  new Set(items.filter((i) => i.reasons.includes('urgent')).map((i) => i.key))

/**
 * The "to approve" queue: tick items, then publish. The server checks the margin of every
 * configuration again before anything changes on the site.
 */
export function PricesQueue({ items }: { items: QueueItem[] }) {
  const router = useRouter()
  const [selected, setSelected] = useState<Set<string>>(() => urgentKeys(items))
  const [result, setResult] = useState<PublishResult | null>(null)
  const [pending, startTransition] = useTransition()

  // After `router.refresh()` the server sends a new queue: start again from its urgent items
  // (React's "adjust state when a prop changes" pattern — no effect, no extra render pass).
  const [shownItems, setShownItems] = useState(items)
  if (items !== shownItems) {
    setShownItems(items)
    setSelected(urgentKeys(items))
  }

  const toggle = (key: string) =>
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

  const publish = () =>
    startTransition(async () => {
      // Only keys still on screen: after a refresh the queue may have changed.
      const keys = items.filter((i) => selected.has(i.key)).map((i) => i.key)
      const outcome = await publishPrices({ keys })
      setResult(outcome)
      if (outcome.ok) router.refresh()
    })

  return (
    <div>
      {items.length === 0 ? (
        <p className={styles.empty}>Brak pozycji do zatwierdzenia.</p>
      ) : (
        <>
          <div
            className={styles.tableWrap}
            role="region"
            aria-label="Pozycje do zatwierdzenia"
            tabIndex={0}
          >
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Publikuj</th>
                  <th scope="col">Pozycja</th>
                  <th scope="col">Obecna cena</th>
                  <th scope="col">Nowa cena</th>
                  <th scope="col">Zmiana</th>
                  <th scope="col">Powód</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const isNew = item.reasons.includes('new')
                  const id = `publish-${item.key}`
                  return (
                    <tr
                      key={item.key}
                      className={item.reasons.includes('urgent') ? styles.urgent : undefined}
                    >
                      <td>
                        <input
                          id={id}
                          type="checkbox"
                          checked={isNew || selected.has(item.key)}
                          disabled={isNew || pending}
                          onChange={() => toggle(item.key)}
                        />
                      </td>
                      <td>
                        <label htmlFor={id}>
                          {TYPE_LABEL[item.itemType]} <strong>{item.itemCode}</strong>
                        </label>
                      </td>
                      <td>{zl(item.published)}</td>
                      <td>{zl(item.candidate)}</td>
                      <td>
                        {item.published === null
                          ? '—'
                          : `${signedZl(item.candidate - item.published)} (${percent(item.change, true)})`}
                      </td>
                      <td>{item.reasons.map((r) => REASON_LABEL[r]).join(', ')}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className={styles.actions}>
            <Button buttonStyle="primary" onClick={publish} disabled={pending}>
              {pending ? 'Sprawdzam marżę…' : 'Sprawdź marżę i opublikuj'}
            </Button>
            <span className={styles.hint}>
              Przed publikacją sprawdzamy marżę wszystkich zgodnych konfiguracji. Nowe pozycje
              publikują się zawsze.
            </span>
          </div>
        </>
      )}

      {/* One live region that stays mounted, so screen readers announce the outcome. */}
      <div aria-live="polite">
        {result?.ok === true && (
          <Banner type="success">
            Opublikowano partię {result.batch} ({result.changed} zmienionych cen).
          </Banner>
        )}
        {result?.ok === false && (
          <Banner type="error">
            <strong>Publikacja zablokowana — na stronie nic się nie zmieniło.</strong>
            <ul className={styles.problems}>
              {result.messages.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          </Banner>
        )}
      </div>
    </div>
  )
}
