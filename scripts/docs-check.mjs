#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import {
  architectureReferenceProblems,
  countLines,
  countWords,
  decisionProblems,
  glossaryProblems,
  LIMITS,
  ruleProblems,
  sizeProblem,
  tableCellProblems,
} from './docs-limits.mjs'
import {
  brokenLinkProblems,
  knownPaths,
  orphanProblems,
  roadmapNowProblem,
  stalePlanProblems,
} from './docs-structure.mjs'

const RULES_DIRECTORY = '.claude/rules'
const DECISIONS_DIRECTORY = 'docs/knowledge/decisions'
const ARCHIVE_FILE = /^archive-\d{4}-Q[1-4]\.md$/u
const LINK_SOURCE = /\.(?:md|mjs|yml)$/u

const problems = []
const add = (problem) => {
  if (problem) problems.push(problem)
}
const readIfExists = (path) => (existsSync(path) ? readFileSync(path, 'utf8') : undefined)
const required = (path) => {
  const text = readIfExists(path)
  if (text === undefined) add(`${path}: file is missing`)
  return text ?? ''
}
const lineLimit = (path, limit) => {
  const text = readIfExists(path)
  if (text !== undefined) add(sizeProblem(path, countLines(text), limit, 'lines'))
}

add(sizeProblem('CLAUDE.md', countWords(required('CLAUDE.md')), LIMITS.claudeWords, 'words'))
problems.push(
  ...ruleProblems(
    readdirSync(RULES_DIRECTORY)
      .filter((name) => name.endsWith('.md'))
      .map((name) => join(RULES_DIRECTORY, name))
      .map((path) => ({ path, text: readFileSync(path, 'utf8') })),
  ),
)

const architecture = required('docs/architecture.md')
add(
  sizeProblem('docs/architecture.md', countWords(architecture), LIMITS.architectureWords, 'words'),
)
const journal = required('docs/knowledge/decisions.md')
problems.push(...decisionProblems(journal, architecture))
const archives = readdirSync(DECISIONS_DIRECTORY)
  .filter((name) => ARCHIVE_FILE.test(name))
  .map((name) => readFileSync(join(DECISIONS_DIRECTORY, name), 'utf8'))
problems.push(...architectureReferenceProblems(architecture, [journal, ...archives]))

problems.push(
  ...tableCellProblems(
    required('docs/knowledge/requirements.md'),
    'requirements.md',
    LIMITS.requirementCellWords,
  ),
)
lineLimit('docs/knowledge/open-questions.md', LIMITS.openQuestionsLines)
problems.push(...glossaryProblems(required('docs/glossary.md')))
lineLimit('.claude/handoff.md', LIMITS.handoffLines)

const files = execFileSync(
  'git',
  ['ls-files', '-z', '--cached', '--others', '--exclude-standard'],
  {
    encoding: 'utf8',
  },
)
  .split('\0')
  .filter((path) => path !== '' && existsSync(path))
const known = knownPaths(files)
const linkSources = files
  .filter((path) => LINK_SOURCE.test(path))
  .map((path) => ({ path, text: readFileSync(path, 'utf8') }))
const roadmap = required('docs/roadmap.md')
add(roadmapNowProblem(roadmap))
problems.push(
  ...stalePlanProblems(files, roadmap),
  ...orphanProblems(files, linkSources),
  ...brokenLinkProblems(linkSources, (path) => known.has(path)),
)

if (problems.length === 0) {
  console.log('Documents are within limits (.claude/rules/docs.md)')
  process.exit(0)
}
console.log(
  `Documents over limits (${String(problems.length)}); roles and limits: .claude/rules/docs.md`,
)
for (const problem of problems) console.log(`  ${problem}`)
process.exit(1)
