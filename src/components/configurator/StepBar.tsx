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
    <ol className="cf-steps" aria-label="Kroki konfiguratora">
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
