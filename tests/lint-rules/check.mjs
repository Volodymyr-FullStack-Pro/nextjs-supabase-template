#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

import { ESLint } from 'eslint'

import { UNDISABLEABLE } from '../../eslint.config.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const fixtures = join(root, 'tests', 'lint-rules', 'fixtures')
const CONFIG_FILE = join(root, 'eslint.config.mjs')
const GUARDS = [
  /^local\/(?!no-comments$)/,
  /^no-restricted-(properties|imports|syntax)$/,
  /^@typescript-eslint\/(no-unsafe-type-assertion|consistent-type-assertions|no-explicit-any|no-require-imports|no-floating-promises)$/,
  /^@eslint-community\/eslint-comments\/(no-restricted-disable|no-use)$/,
]
const MARKER = /expect: (?<rules>[^\n]+?)\s*(?:\*\/\}?)?$/
const MARKER_ABOVE = /^\s*\/\/ expect: /
const STRICT_MARKER = /expect-strict: (?<rules>[^\n]+?)\s*(?:\*\/\}?)?$/
const STRICT_MARKER_ABOVE = /^\s*\/\/ expect-strict: /
// boundaries resolve from the project root and probes lie deeper, so probes skip it: npm run lint and the strict pass over src cover it.
const WITHOUT_BOUNDARIES = {
  rules: {
    'boundaries/dependencies': 'off',
    'boundaries/no-unknown-files': 'off',
    'boundaries/no-unknown-dependencies': 'off',
  },
}

const escapeForRegExp = (text) => text.replaceAll(/[.+?^${}()|[\]\\]/g, String.raw`\$&`)
const toPattern = (glob) => new RegExp(`^${escapeForRegExp(glob).replaceAll('*', '.*')}$`)
// Read like no-restricted-disable: the last match wins, "!" allows a rule again.
function isUndisableable(ruleId) {
  let restricted = false
  for (const entry of UNDISABLEABLE) {
    const negated = entry.startsWith('!')
    if (toPattern(negated ? entry.slice(1) : entry).test(ruleId)) restricted = !negated
  }
  return restricted
}

const isGuard = (ruleId) => GUARDS.some((pattern) => pattern.test(ruleId))
const key = (line, ruleId) => `${String(line)} ${ruleId}`

function markedIn(source, marker, markerAbove) {
  const expected = new Set()
  for (const [index, text] of source.split('\n').entries()) {
    const rules = marker.exec(text)?.groups?.rules.split(',') ?? []
    const line = markerAbove.test(text) ? index + 2 : index + 1
    for (const rule of rules) expected.add(key(line, rule.trim()))
  }
  return expected
}

function compare({ filePath, messages }) {
  const source = readFileSync(filePath, 'utf8')
  const expected = markedIn(source, MARKER, MARKER_ABOVE)
  const strict = markedIn(source, STRICT_MARKER, STRICT_MARKER_ABOVE)
  const isGoodCode = expected.size === 0 && strict.size === 0
  const reported = messages.filter(({ ruleId }) => isGoodCode || (ruleId && isGuard(ruleId)))
  const actual = new Set(reported.map(({ line, ruleId }) => key(line, ruleId ?? 'parse error')))
  const file = relative(fixtures, filePath)
  return {
    file,
    expected,
    strict,
    failures: [
      ...[...expected.difference(actual)].map((miss) => `${file}:${miss}: not reported`),
      ...[...actual.difference(expected)].map((extra) => `${file}:${extra}: unexpected report`),
    ],
  }
}

const eslint = new ESLint({
  cwd: fixtures,
  overrideConfigFile: CONFIG_FILE,
  overrideConfig: WITHOUT_BOUNDARIES,
})
const results = await eslint.lintFiles(['.'])
const compared = results.map(compare)
const failures = compared.flatMap((result) => result.failures)

const config = await eslint.calculateConfigForFile(join(fixtures, 'src/modules/sample/domain/x.ts'))
const probed = new Set(
  compared.flatMap(({ expected }) => [...expected].map((item) => item.split(' ')[1])),
)
const localRules = Object.keys(config.plugins.local.rules).map((name) => `local/${name}`)
for (const rule of localRules.filter((name) => isGuard(name) && !probed.has(name))) {
  failures.push(`${rule}: the rule has no probe in tests/lint-rules/fixtures`)
}

const strictOptions = {
  overrideConfigFile: CONFIG_FILE,
  allowInlineConfig: false,
  ruleFilter: ({ ruleId }) => isUndisableable(ruleId),
}
const undisableableIn = (lintResults) =>
  lintResults.flatMap(({ filePath, messages }) =>
    messages
      .filter(({ ruleId }) => ruleId && isUndisableable(ruleId))
      .map(({ line, ruleId }) => ({ filePath, line, ruleId })),
  )

const strictFixtures = compared.filter(({ strict }) => strict.size > 0)
if (strictFixtures.length === 0) {
  failures.push('no bypass probe (expect-strict): the strict pass is not checked')
} else {
  const strictEslint = new ESLint({
    ...strictOptions,
    cwd: fixtures,
    overrideConfig: WITHOUT_BOUNDARIES,
  })
  const found = undisableableIn(
    await strictEslint.lintFiles(strictFixtures.map(({ file }) => file)),
  )
  for (const { file, strict } of strictFixtures) {
    const actual = new Set(
      found
        .filter(({ filePath }) => relative(fixtures, filePath) === file)
        .map(({ line, ruleId }) => key(line, ruleId)),
    )
    for (const miss of strict.difference(actual)) {
      failures.push(`${file}:${miss}: the strict pass did not see a guard disabled by a comment`)
    }
  }
}

const sourceEslint = new ESLint({ ...strictOptions, cwd: root })
const brokenInSource = new Set(
  undisableableIn(await sourceEslint.lintFiles(['src'])).map(
    ({ filePath, line, ruleId }) => `${relative(root, filePath)}:${String(line)} ${ruleId}`,
  ),
)
for (const place of brokenInSource) {
  failures.push(
    `${place}: a guard is violated in code; if npm run lint does not show it, an ESLint comment hides it: remove the comment and fix the cause`,
  )
}

if (failures.length > 0) {
  console.error(`Lint guards: ${String(failures.length)} mismatches`)
  for (const failure of failures) console.error(`  ✗ ${failure}`)
  process.exit(1)
}
const marks = compared.reduce((sum, { expected }) => sum + expected.size, 0)
const strictMarks = compared.reduce((sum, { strict }) => sum + strict.size, 0)
const goodFiles = compared.filter(
  ({ expected, strict }) => expected.size + strict.size === 0,
).length
console.log(
  `Lint guards: ${String(marks)} expected reports in place, ${String(strictMarks)} in the strict pass, ${String(goodFiles)} good-code files clean (probes: ${String(results.length)}); no guard in src is disabled by a comment`,
)
