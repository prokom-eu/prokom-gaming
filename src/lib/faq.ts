import { FAQ_GROUPS, type FaqGroup } from '@/collections/Faq'
import { plural } from '@/lib/pl'

/** Groups of the `/pytania` page in board order (spec. §19): no home or build-page questions. */
export const FAQ_PAGE_GROUPS = ['purchase', 'delivery', 'returns', 'tech', 'parents'] as const

export type FaqPageGroup = (typeof FAQ_PAGE_GROUPS)[number]

export type FaqQuestion = { id: number; question: string; answer: string }

export type FaqSection = {
  group: FaqPageGroup
  label: string
  questions: FaqQuestion[]
}

const labelOf = (group: FaqGroup): string =>
  FAQ_GROUPS.find((g) => g.value === group)?.label ?? group

/**
 * Questions split into the page groups, in board order. Input is sorted by `order` already; an
 * empty group is left out, so a group emptied in the panel does not leave a dead button.
 */
export function faqSections(
  docs: readonly (FaqQuestion & { group: FaqGroup | null | undefined })[],
): FaqSection[] {
  return FAQ_PAGE_GROUPS.map((group) => ({
    group,
    label: labelOf(group),
    questions: docs
      .filter((doc) => doc.group === group)
      .map(({ id, question, answer }) => ({ id, question, answer })),
  })).filter((section) => section.questions.length > 0)
}

/** „6 pytań”, „4 pytania” (board: count next to the group name). */
export const questionsCount = (n: number): string =>
  `${n} ${plural(n, ['pytanie', 'pytania', 'pytań'])}`

/** `FAQPage` JSON-LD with every question of the page, not only the open group (spec. §19). */
export function faqPageJsonLd(sections: readonly FaqSection[]): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: sections.flatMap((section) =>
      section.questions.map((q) => ({
        '@type': 'Question',
        name: q.question,
        acceptedAnswer: { '@type': 'Answer', text: q.answer },
      })),
    ),
  }
}
