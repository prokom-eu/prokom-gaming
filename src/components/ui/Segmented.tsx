'use client'

import { useRef, type KeyboardEvent } from 'react'

type Option<T extends string> = {
  value: T
  label: string
  /** Shown but not selectable (e.g. a resolution without data); arrows skip it. */
  disabled?: boolean
}

const STEPS: Partial<Record<string, 1 | -1>> = {
  ArrowRight: 1,
  ArrowDown: 1,
  ArrowLeft: -1,
  ArrowUp: -1,
}

type Props<T extends string> = {
  /** Accessible name of the group, e.g. "Rozdzielczość". */
  label: string
  options: readonly Option<T>[]
  value: T
  onChange: (value: T) => void
  /** Class of the group; the panel uses its own look (`pn-seg`). */
  className?: string
}

/**
 * Single choice as segments (FullHD / 2K / 4K). A radio group: one tab stop, arrows move and
 * select (WAI-ARIA radio pattern), so it reads the same as native radios.
 */
export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
  className = 'seg',
}: Props<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])

  /** Next enabled index from `index` in direction `step` (wrapping), or undefined. */
  function nextEnabled(index: number, step: 1 | -1): number | undefined {
    for (let i = 1; i <= options.length; i++) {
      const n = options.length
      const candidate = (((index + step * i) % n) + n) % n
      if (!options[candidate].disabled) return candidate
    }
    return undefined
  }

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const step = STEPS[event.key]
    let next: number | undefined
    if (step !== undefined) next = nextEnabled(index, step)
    else if (event.key === 'Home') next = nextEnabled(options.length - 1, 1)
    else if (event.key === 'End') next = nextEnabled(0, -1)
    if (next === undefined) return
    event.preventDefault()
    onChange(options[next].value)
    refs.current[next]?.focus()
  }

  return (
    <div role="radiogroup" aria-label={label} className={className}>
      {options.map((option, index) => {
        const checked = option.value === value
        return (
          <button
            key={option.value}
            ref={(el) => {
              refs.current[index] = el
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            disabled={option.disabled}
            tabIndex={checked ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => onKeyDown(event, index)}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
