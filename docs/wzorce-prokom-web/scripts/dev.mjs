// `pnpm dev`: `next dev` with the variables of this folder's `.env` (its PORT, docs/sposob-pracy.md).
// Next reads PORT while parsing the command line, before it loads `.env` itself, so the file is
// loaded here first; variables already set (e.g. PORT from Playwright) win over the file.
// Not `node --env-file-if-exists`: Next copies Node's flags into NODE_OPTIONS of its server
// process, where Node rejects that flag and the server exits at once.
import { existsSync } from 'node:fs'
import { createRequire } from 'node:module'

if (existsSync('.env')) process.loadEnvFile('.env')

// Same process, so Ctrl+C and the exit code behave as with `next dev`.
process.argv.splice(2, 0, 'dev')
createRequire(import.meta.url)('next/dist/bin/next')
