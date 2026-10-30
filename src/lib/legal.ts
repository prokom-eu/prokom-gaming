import type { LegalTerm } from '@/payload-types'

/** Content of a legal global (the same shape for terms and privacy). */
export type LegalContent = LegalTerm['content']

type LexicalNode = { type: string; tag?: string; text?: string; children?: LexicalNode[] }

/**
 * A legal global with content. On a fresh server database the global has no row yet and
 * Payload returns `{}` (the seed does not run there) — the page then shows its fallback.
 */
export function hasLegalContent(doc: unknown): doc is { content: LegalContent } {
  const content = (doc as { content?: { root?: { children?: unknown } } } | null)?.content
  return Array.isArray(content?.root?.children)
}

export type LegalHeading = { node: unknown; id: string; title: string; number: number }

/** Plain text of a node and its children. */
export function nodeText(node: LexicalNode): string {
  if (typeof node.text === 'string') return node.text
  return (node.children ?? []).map(nodeText).join('')
}

/** Address fragment from a heading: „Zwrot w 14 dni” → `zwrot-w-14-dni`, „Cookies” → `cookies`. */
export function headingId(title: string): string {
  return title
    .toLowerCase()
    .replace(/ł/g, 'l')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/**
 * The `##` headings of the content in order: „§ n”, the table of contents and the anchors
 * (`/polityka-prywatnosci#cookies` from the footer). Equal titles get a number suffix.
 */
export function legalHeadings(content: LegalContent): LegalHeading[] {
  const seen = new Map<string, number>()
  const nodes = content.root.children as LexicalNode[]
  return nodes
    .filter((node) => node.type === 'heading' && node.tag === 'h2')
    .map((node, i) => {
      const title = nodeText(node).trim()
      const base = headingId(title) || `paragraf-${i + 1}`
      const count = (seen.get(base) ?? 0) + 1
      seen.set(base, count)
      return { node, id: count === 1 ? base : `${base}-${count}`, title, number: i + 1 }
    })
}
