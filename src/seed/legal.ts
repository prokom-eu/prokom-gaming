/**
 * Legal texts from seed/prokomgaming/legal.json + the .md files next to it (spec. §21). The
 * runner (`index.ts`) converts the Markdown to Lexical with the editor of the globals, so the
 * panel opens the same content it would have typed itself.
 */
import { readFileSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

import legalSeed from '../../seed/prokomgaming/legal.json'

const SEED_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../seed/prokomgaming',
)

export type LegalSeed = {
  slug: 'legal-terms' | 'legal-privacy'
  markdown: string
  version: string
  draft: boolean
  summary: { point: string }[]
}

type Entry = (typeof legalSeed)['terms']

const entry = (slug: LegalSeed['slug'], data: Entry): LegalSeed => ({
  slug,
  markdown: readFileSync(path.join(SEED_DIR, data.contentFile), 'utf8'),
  version: data.version,
  draft: data.draft,
  summary: data.summary.map((point) => ({ point })),
})

export function legalSeeds(): LegalSeed[] {
  return [entry('legal-terms', legalSeed.terms), entry('legal-privacy', legalSeed.privacy)]
}

type Node = { type: string; text?: string; children?: Node[]; [key: string]: unknown }

/**
 * Lexical's Markdown import joins the lines of a quote without a break, so the return form
 * template marks its lines with `<br>`; this turns them into `linebreak` nodes.
 */
export function splitLineBreaks<T extends { root: { children: unknown[] } }>(state: T): T {
  const split = (node: Node): Node[] => {
    if (node.type === 'text' && typeof node.text === 'string' && node.text.includes('<br>')) {
      return node.text
        .split(/\s*<br>\s*/)
        .flatMap((part, i) => [
          ...(i > 0 ? [{ type: 'linebreak', version: 1 }] : []),
          { ...node, text: part },
        ])
    }
    return [node.children ? { ...node, children: node.children.flatMap(split) } : node]
  }
  return {
    ...state,
    root: { ...state.root, children: (state.root.children as Node[]).flatMap(split) },
  }
}
