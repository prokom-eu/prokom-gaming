'use client'

import { useState, useSyncExternalStore, type ReactNode } from 'react'

import { questionsCount, type FaqSection } from '@/lib/faq'

/**
 * Groups of `/pytania` (board FAQ): buttons switch the shown group, the first question of the
 * group is open. Until the script runs every group is shown, so the page reads in full without
 * JavaScript; after that the inactive ones are `hidden`. JSON-LD lists all questions anyway.
 */
const noop = () => () => {}

export function FaqBrowser({ sections, aside }: { sections: FaqSection[]; aside: ReactNode }) {
  const [active, setActive] = useState(sections[0]?.group)
  // false in the server HTML, true once hydrated (no effect, no extra render).
  const ready = useSyncExternalStore(
    noop,
    () => true,
    () => false,
  )

  return (
    <div className="ct-faq">
      <div className="ct-faq__nav">
        <div className="ct-faq__groups" role="group" aria-label="Grupy pytań">
          {sections.map((s) => (
            <button
              key={s.group}
              type="button"
              className={s.group === active ? 'on' : undefined}
              aria-pressed={s.group === active}
              aria-controls={`faq-${s.group}`}
              onClick={() => setActive(s.group)}
            >
              {s.label}
              <em>{questionsCount(s.questions.length)}</em>
            </button>
          ))}
        </div>
        {aside}
      </div>
      <div>
        {sections.map((s) => (
          <section
            key={s.group}
            id={`faq-${s.group}`}
            className="ct-faq__body"
            aria-labelledby={`faq-${s.group}-title`}
            hidden={ready && s.group !== active}
          >
            <h2 id={`faq-${s.group}-title`} className="h">
              {s.label}
            </h2>
            {s.questions.map((q, i) => (
              <details key={q.id} className="ct-qa" open={i === 0}>
                <summary>
                  {q.question}
                  <i aria-hidden="true" />
                </summary>
                <p>{q.answer}</p>
              </details>
            ))}
          </section>
        ))}
      </div>
    </div>
  )
}
