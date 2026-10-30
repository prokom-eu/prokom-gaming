import type { TimelineStep } from '@/lib/orders'

/**
 * The order timeline of the boards Metryka and Konto (`ol.tl`): 8 steps, done / now / to come.
 * The current step is also named for screen readers (`aria-current`).
 */
export function Timeline({ steps, label }: { steps: readonly TimelineStep[]; label: string }) {
  return (
    <ol className="tl" aria-label={label}>
      {steps.map((step) => (
        <li
          key={step.label}
          className={step.state === 'todo' ? undefined : step.state}
          aria-current={step.state === 'now' ? 'step' : undefined}
        >
          <i aria-hidden="true" />
          <span>{step.label}</span>
        </li>
      ))}
    </ol>
  )
}
