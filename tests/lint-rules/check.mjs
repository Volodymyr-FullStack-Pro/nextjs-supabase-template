#!/usr/bin/env node
// Самопроверка защит линтера. Запуск: npm run lint:rules. Три проверки.
//
// 1. Пробы. Файлы в fixtures/ лежат по тем же путям, что и код (src/modules/<модуль>/<слой>/…), и линтуются настоящим
//    eslint.config.mjs. Ошибка помечена «// expect: <правило>» в конце своей строки или отдельной строкой над ней;
//    в файле с пометками сверяются только защиты (GUARDS), файл без пометок — хороший код и обязан быть чистым
//    по всем правилам. Каждое локальное правило обязано иметь пробу.
// 2. Пробы обхода. «// expect-strict: <правило>» — срабатывание, которое обычный проход не видит, потому что
//    комментарий в файле отключил и защиту, и правило, запрещающее её отключать. Его обязан показать строгий проход:
//    тот же конфиг с allowInlineConfig: false, где комментарии ESLint не действуют.
// 3. Строгий проход по настоящему src: любое сообщение неотключаемого правила (UNDISABLEABLE в eslint.config.mjs)
//    значит, что защиту в коде сняли комментарием — npm run lint этого не видит.
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
  /^@typescript-eslint\/(no-unsafe-type-assertion|consistent-type-assertions|no-explicit-any)$/,
  /^@eslint-community\/eslint-comments\/(no-restricted-disable|no-use)$/,
]
const MARKER = /expect: (?<rules>[^\n]+?)\s*(?:\*\/\}?)?$/
const MARKER_ABOVE = /^\s*\/\/ expect: /
const STRICT_MARKER = /expect-strict: (?<rules>[^\n]+?)\s*(?:\*\/\}?)?$/
const STRICT_MARKER_ABOVE = /^\s*\/\/ expect-strict: /
// Границы слоёв считаются от корня проекта, а пробы лежат глубже: в пробах boundaries не проверяется
// (его держит npm run lint, а неотключаемость — строгий проход по src).
const WITHOUT_BOUNDARIES = {
  rules: {
    'boundaries/dependencies': 'off',
    'boundaries/no-unknown-files': 'off',
    'boundaries/no-unknown-dependencies': 'off',
  },
}

const escapeForRegExp = (text) => text.replaceAll(/[.+?^${}()|[\]\\]/g, String.raw`\$&`)
const toPattern = (glob) => new RegExp(`^${escapeForRegExp(glob).replaceAll('*', '.*')}$`)
// Список читается как у no-restricted-disable: последнее совпадение побеждает, «!» возвращает правило в разрешённые.
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
  const actual = new Set(reported.map(({ line, ruleId }) => key(line, ruleId ?? 'ошибка разбора')))
  const file = relative(fixtures, filePath)
  return {
    file,
    expected,
    strict,
    failures: [
      ...[...expected.difference(actual)].map((miss) => `${file}:${miss} — не сработало`),
      ...[...actual.difference(expected)].map((extra) => `${file}:${extra} — лишнее срабатывание`),
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
  failures.push(`${rule} — у правила нет пробы в tests/lint-rules/fixtures`)
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
  failures.push('нет ни одной пробы обхода (expect-strict): строгий проход не проверен')
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
      failures.push(`${file}:${miss} — строгий проход не увидел защиту, отключённую комментарием`)
    }
  }
}

const sourceEslint = new ESLint({ ...strictOptions, cwd: root })
const disabledInSource = undisableableIn(await sourceEslint.lintFiles(['src']))
for (const { filePath, line, ruleId } of disabledInSource) {
  failures.push(
    `${relative(root, filePath)}:${String(line)} ${ruleId} — защита отключена комментарием в коде: уберите комментарий и исправьте причину`,
  )
}

if (failures.length > 0) {
  console.error(`Защиты линтера: ${String(failures.length)} расхождений`)
  for (const failure of failures) console.error(`  ✗ ${failure}`)
  process.exit(1)
}
const marks = compared.reduce((sum, { expected }) => sum + expected.size, 0)
const strictMarks = compared.reduce((sum, { strict }) => sum + strict.size, 0)
const goodFiles = compared.filter(
  ({ expected, strict }) => expected.size + strict.size === 0,
).length
console.log(
  `Защиты линтера: ${String(marks)} ожидаемых срабатываний на месте, ${String(strictMarks)} — в строгом проходе, ${String(goodFiles)} файлов хорошего кода чисты (всего проб: ${String(results.length)}); в src защиты комментариями не отключены`,
)
