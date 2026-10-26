/**
 * ADR-G002 §8.8: the cost layer never reaches the browser bundle. Next refuses to build a client
 * module that imports `server-only`; this test makes sure the marker stays in place and that no
 * client module imports the cost layer directly.
 */
import { readdirSync, readFileSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { describe, expect, it } from 'vitest'

const here = path.dirname(fileURLToPath(import.meta.url))
const src = path.resolve(here, '../..')

const SERVER_ONLY_MODULES = ['catalog.ts', 'cost.ts', 'publish.ts', 'store.ts']

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) return sourceFiles(full)
    return /\.(ts|tsx)$/.test(entry.name) ? [full] : []
  })
}

describe('cost layer stays on the server', () => {
  it.each(SERVER_ONLY_MODULES)('%s starts with import "server-only"', (file) => {
    const code = readFileSync(path.join(here, file), 'utf8')
    expect(code.trimStart().startsWith("import 'server-only'")).toBe(true)
  })

  it('no "use client" module imports the cost layer (types only are fine — they vanish)', () => {
    const valueImport =
      /^import (?!type\b)[^\n]*from ['"][^'"]*pricing\/(cost|catalog|publish|store)['"]/m
    const offenders = sourceFiles(src).filter((file) => {
      const code = readFileSync(file, 'utf8')
      const isClient = /^\s*['"]use client['"]/.test(code)
      return isClient && valueImport.test(code)
    })
    expect(offenders).toEqual([])
  })

  it('the Payload config never imports the prices screen (it is referenced by path)', () => {
    const config = readFileSync(path.join(src, 'payload.config.ts'), 'utf8')
    expect(config).not.toMatch(/from ['"][^'"]*(admin\/prices|lib\/pricing)/)
  })
})
