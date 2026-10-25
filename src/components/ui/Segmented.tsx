'use client'

import { useRef, type KeyboardEvent } from 'react'

type Option<T extends string> = { value: T; label: string }

type Props<T extends string> = {
  /** Accessible name of the group, e.g. "Rozdzielczość". */
  label: string
  options: readonly Option<T>[]
  value: T
  onChange: (value: T) => void
}

/**
 * Single choice as segments (FullHD / 2K / 4K). A radio group: one tab stop, arrows move and
 * select (WAI-ARIA radio pattern), so it reads the same as native radios.
 */
export function Segmented<T extends string>({ label, options, value, onChange }: Props<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key]
    let next: number | undefined
    if (step !== undefined) next = (index + step + options.length) % options.length
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = options.length - 1
    if (next === undefined) return
    event.preventDefault()
    onChange(options[next].value)
    refs.current[next]?.focus()
  }

  return (
    <div role="radiogroup" aria-label={label} className="seg">
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
