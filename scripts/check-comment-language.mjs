#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'

import { cyrillicComments } from './comment-language.mjs'

const SKIPPED = /^docs\/|\.(?:md|html|pdf)$/u

const files = execFileSync(
  'git',
  ['ls-files', '-z', '--cached', '--others', '--exclude-standard'],
  {
    encoding: 'utf8',
  },
)
  .split('\0')
  .filter((path) => path !== '' && !SKIPPED.test(path) && existsSync(path))

const problems = [...new Set(files)].flatMap((path) =>
  cyrillicComments(path, readFileSync(path, 'utf8')).map(
    ({ line, text }) => `${path}:${String(line)}: ${text}`,
  ),
)

if (problems.length === 0) {
  console.log('Comments are in English (.claude/rules/code-style.md)')
  process.exit(0)
}
console.log(
  `Cyrillic in comments (${String(problems.length)}): comments are written in English (.claude/rules/code-style.md)`,
)
for (const problem of problems) console.log(`  ${problem}`)
process.exit(1)
