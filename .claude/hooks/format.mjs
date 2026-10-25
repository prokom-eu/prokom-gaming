// Claude Code PostToolUse hook (Edit|Write): formats the edited file with the project's Prettier.
// Input: hook JSON on stdin (tool_input.file_path). Files outside the repo, unknown types and
// paths in .prettierignore are skipped. Exit 2 shows the error to Claude (the edit itself stays).
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'

const projectDir = process.env.CLAUDE_PROJECT_DIR ?? process.cwd()

let raw = ''
for await (const chunk of process.stdin) raw += chunk

let filePath
try {
  filePath = JSON.parse(raw)?.tool_input?.file_path
} catch {
  process.exit(0)
}
if (typeof filePath !== 'string' || !existsSync(filePath)) process.exit(0)

const relative = path.relative(projectDir, path.resolve(filePath))
if (relative.startsWith('..') || path.isAbsolute(relative)) process.exit(0)

const prettier = path.join(projectDir, 'node_modules', 'prettier', 'bin', 'prettier.cjs')
if (!existsSync(prettier)) process.exit(0)

const result = spawnSync(
  process.execPath,
  [prettier, '--write', '--ignore-unknown', '--log-level', 'warn', relative],
  { cwd: projectDir, encoding: 'utf8' },
)
if (result.status !== 0) {
  process.stderr.write(`Prettier failed for ${relative}:\n${result.stderr || result.stdout}`)
  process.exit(2)
}
