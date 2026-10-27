import type { HomeQuestion } from '@/lib/home'

/**
 * "Zanim zapytasz" (spec. §4 pt 12): the six home questions from the `faq` collection. Native
 * `<details>`, no JavaScript; the first one open like the board.
 */
export function HomeFaq({ questions }: { questions: HomeQuestion[] }) {
  if (questions.length === 0) return null
  return (
    <section className="hm-sec hm-faq" aria-labelledby="faq-title">
      <div className="wrap hm-faq__in">
        <h2 id="faq-title" className="h">
          Zanim zapytasz
        </h2>
        {questions.map((q, i) => (
          <details key={q.id} open={i === 0}>
            <summary>
              {q.question}
              <i aria-hidden="true" />
            </summary>
            <p>{q.answer}</p>
          </details>
        ))}
      </div>
    </section>
  )
}
