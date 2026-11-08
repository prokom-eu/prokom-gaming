import type { CSSProperties } from 'react'

import { STEPS, type StepKey } from '@/lib/configurator'

import type { ConfiguratorView } from './view'

/**
 * Six steps (board `.k2-steps`): number, name, the current value. Any step can be opened — the
 * configuration is always valid, so there is nothing to „unlock”. Phone: a scrolled row.
 */
export function StepBar({
  view,
  current,
  onGo,
}: {
  view: ConfiguratorView
  current: StepKey
  onGo: (step: StepKey) => void
}) {
  const index = STEPS.findIndex((s) => s.key === current)
  return (
    // --step drives the gold marker that slides under the current step (PREMIUM §2.3).
    <ol
      className="cf-steps"
      aria-label="Kroki konfiguratora"
      style={{ '--step': index } as CSSProperties}
    >
      {STEPS.map((s, i) => (
        <li key={s.key}>
          <button
            type="button"
            className={i === index ? 'is-on' : i < index ? 'is-done' : undefined}
            aria-current={i === index ? 'step' : undefined}
            onClick={() => onGo(s.key)}
          >
            <em aria-hidden="true">{i + 1}</em>
            <span>{s.name}</span>
            <small>{view.stepValues[s.key]}</small>
          </button>
        </li>
      ))}
    </ol>
  )
}
