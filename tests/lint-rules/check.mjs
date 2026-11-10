#!/usr/bin/env node
// Самопроверка защит линтера: пробы в fixtures/ лежат по тем же путям, что и код (src/modules/<модуль>/<слой>/…),
// и линтуются настоящим eslint.config.mjs. Ошибка помечена «// expect: <правило>» в конце своей строки или отдельной
// строкой над ней; в файле с пометками сверяются только защиты (GUARDS), файл без пометок — хороший код и обязан
// быть чистым по всем правилам.
// Каждое локальное правило обязано иметь пробу. Запуск: npm run lint:rules.
import { readFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

import { ESLint } from 'eslint'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const fixtures = join(root, 'tests', 'lint-rules', 'fixtures')
const GUARDS = [
  /^local\/(?!no-comments$)/,
  /^no-restricted-properties$/,
  /^@typescript-eslint\/no-unsafe-type-assertion$/,
  /^@eslint-community\/eslint-comments\/no-restricted-disable$/,
]
const MARKER = /expect: (?<rules>[^\n]+?)\s*(?:\*\/\}?)?$/
const MARKER_ABOVE = /^\s*\/\/ expect: /
// Границы слоёв считаются от корня проекта, а пробы лежат глубже: boundaries здесь не проверяется (его держит npm run lint).
const WITHOUT_BOUNDARIES = {
  rules: {
    'boundaries/dependencies': 'off',
    'boundaries/no-unknown-files': 'off',
    'boundaries/no-unknown-dependencies': 'off',
  },
}

const isGuard = (ruleId) => GUARDS.some((pattern) => pattern.test(ruleId))
const key = (line, ruleId) => `${String(line)} ${ruleId}`

function expectedIn(source) {
  const expected = new Set()
  for (const [index, text] of source.split('\n').entries()) {
    const rules = MARKER.exec(text)?.groups?.rules.split(',') ?? []
    const line = MARKER_ABOVE.test(text) ? index + 2 : index + 1
    for (const rule of rules) expected.add(key(line, rule.trim()))
  }
  return expected
}

function compare({ filePath, messages }) {
  const expected = expectedIn(readFileSync(filePath, 'utf8'))
  const isGoodCode = expected.size === 0
  const reported = messages.filter(({ ruleId }) => isGoodCode || (ruleId && isGuard(ruleId)))
  const actual = new Set(reported.map(({ line, ruleId }) => key(line, ruleId ?? 'ошибка разбора')))
  const file = relative(fixtures, filePath)
  return {
    expected,
    failures: [
      ...[...expected.difference(actual)].map((miss) => `${file}:${miss} — не сработало`),
      ...[...actual.difference(expected)].map((extra) => `${file}:${extra} — лишнее срабатывание`),
    ],
  }
}

const eslint = new ESLint({
  cwd: fixtures,
  overrideConfigFile: join(root, 'eslint.config.mjs'),
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

if (failures.length > 0) {
  console.error(`Защиты линтера: ${String(failures.length)} расхождений с пробами`)
  for (const failure of failures) console.error(`  ✗ ${failure}`)
  process.exit(1)
}
const marks = compared.reduce((sum, { expected }) => sum + expected.size, 0)
const goodFiles = compared.filter(({ expected }) => expected.size === 0).length
console.log(
  `Защиты линтера: ${String(marks)} ожидаемых срабатываний на месте, ${String(goodFiles)} файлов хорошего кода чисты (всего файлов: ${String(results.length)})`,
)
