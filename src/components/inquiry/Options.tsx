'use client'

/**
 * A row of pill buttons (board `.opt6`): one choice, or several when `value` is a list. Each button says
 * whether it is chosen through `aria-pressed`, the group is named by its heading.
 */
export function Options<V extends string>({
  labelledBy,
  choices,
  value,
  onChange,
  optional = true,
}: {
  labelledBy: string
  choices: readonly { value: V; label: string }[]
  value: V | null | readonly V[]
  onChange: (value: V) => void
  /** A single choice that may be unpicked by pressing it again. */
  optional?: boolean
}) {
  const chosen = (v: V) => (Array.isArray(value) ? value.includes(v) : value === v)
  return (
    <div className="iq-opts" role="group" aria-labelledby={labelledBy}>
      {choices.map((c) => (
        <button
          key={c.value}
          type="button"
          className="iq-opt"
          aria-pressed={chosen(c.value)}
          // A required single choice stays picked when pressed again.
          onClick={() => (optional || !chosen(c.value) ? onChange(c.value) : undefined)}
        >
          {c.label}
        </button>
      ))}
    </div>
  )
}

/** Single choice: pressing the picked one again clears it. */
export const pickOne = <V extends string>(current: V | null, value: V): V | null =>
  current === value ? null : value
