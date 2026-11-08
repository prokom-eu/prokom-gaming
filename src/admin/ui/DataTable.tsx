import type { ReactNode } from 'react'

export type Column<R> = {
  key: string
  label: string
  align?: 'right'
  render: (row: R) => ReactNode
}

type Selection<R> = {
  /** Accessible name of the row's checkbox, e.g. "Zatwierdź: 16 GB DDR4". */
  label: (row: R) => string
  checked: (row: R) => boolean
  /** A row that cannot change (e.g. a new price that is always published). */
  disabled?: (row: R) => boolean
  onToggle?: (row: R) => void
  name?: string
  value?: (row: R) => string
}

/**
 * Dense table of the panel (spec §2) with a sticky header. On a phone the same markup becomes
 * cards (spec §2a pt 5, stany/tel-05): the first column is the card title, the rest are
 * "label over value" pairs in two columns (labels from `data-label`), the checkbox in the top
 * right corner. Pure CSS — no second markup, no device detection. Usable from server and
 * client components (no hooks).
 */
export function DataTable<R>({
  caption,
  columns,
  rows,
  rowKey,
  selection,
}: {
  /** Accessible name of the table (shown only to screen readers). */
  caption: string
  columns: readonly Column<R>[]
  rows: readonly R[]
  rowKey: (row: R) => string
  selection?: Selection<R>
}) {
  const [first, ...rest] = columns
  if (!first) return null
  const align = (c: Column<R>) => (c.align === 'right' ? 'pn-r' : undefined)
  return (
    <div className="pn-tbx">
      <table className="pn-t">
        <caption className="pn-sr">{caption}</caption>
        <thead>
          <tr>
            {selection ? (
              <th scope="col">
                <span className="pn-sr">Wybór</span>
              </th>
            ) : null}
            {columns.map((c) => (
              <th key={c.key} scope="col" className={align(c)}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)} className={selection ? 'pn-t__sel' : undefined}>
              {selection ? (
                <td>
                  <input
                    type="checkbox"
                    className="pn-cb"
                    aria-label={selection.label(row)}
                    name={selection.name}
                    value={selection.value?.(row)}
                    checked={selection.checked(row)}
                    disabled={selection.disabled?.(row)}
                    readOnly={!selection.onToggle}
                    onChange={selection.onToggle ? () => selection.onToggle?.(row) : undefined}
                  />
                </td>
              ) : null}
              <th scope="row" className={align(first)}>
                {first.render(row)}
              </th>
              {rest.map((c) => (
                <td key={c.key} data-label={c.label} className={align(c)}>
                  {c.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
