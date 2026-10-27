/**
 * Questions from seed/prokomgaming/faq.json mapped to `faq` documents (G8). Pure, no database:
 * the runner (`index.ts`) upserts by group + question; `faq.test.ts` checks the mapping.
 */
import type { Faq } from '../payload-types'
import faqSeed from '../../seed/prokomgaming/faq.json'
import { FAQ_GROUPS, type FaqGroup } from '../collections/Faq'

type SeedFaq = { group: string; items: { q: string; a: string }[] }

export type FaqData = Omit<Faq, 'id' | 'createdAt' | 'updatedAt'>

const groupValue = new Map<string, FaqGroup>(FAQ_GROUPS.map((g) => [g.label, g.value]))

/** Every question in file order; `order` restarts at 1 in each group. */
export function mapFaq(groups: readonly SeedFaq[] = faqSeed.items): FaqData[] {
  return groups.flatMap((group) => {
    const value = groupValue.get(group.group)
    if (!value) throw new Error(`Seed: unknown FAQ group „${group.group}”.`)
    return group.items.map((item, i) => ({
      question: item.q,
      answer: item.a,
      group: value,
      order: i + 1,
    }))
  })
}
