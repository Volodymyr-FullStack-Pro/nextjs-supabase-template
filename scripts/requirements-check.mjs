#!/usr/bin/env node
// Проверка реестра требований заказчика (docs/knowledge/requirements.md):
// номера уникальны, статусы из списка, принятые требования упомянуты в roadmap, планах, тестах или коде.
// Запуск: npm run req:check [-- --register <файл>] [--scan <путь>...] [--strict]
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const STATUSES = ['открыт', 'получен', 'в ТЗ', 'в работе', 'сделан', 'отклонён', 'заменён']
const ID_RE = /^[A-Z]{1,2}-?\d{1,4}$/
const SKIP_DIRS = new Set([
  'node_modules',
  '.next',
  '.git',
  'coverage',
  'playwright-report',
  'test-results',
])

const args = process.argv.slice(2)
const flag = (name) => args.includes(name)
const values = (name) => {
  const out = []
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === name && args[i + 1] && !args[i + 1].startsWith('--')) out.push(args[i + 1])
  }
  return out
}
const register = values('--register')[0] ?? 'docs/knowledge/requirements.md'
const scan = values('--scan')
const scanPaths = scan.length ? scan : ['docs/roadmap.md', 'docs/superpowers/plans', 'tests', 'src']

const rows = []
let statusIdx = -1
for (const line of readFileSync(register, 'utf8').split('\n')) {
  if (!line.startsWith('|')) continue
  const cells = line.split('|').map((c) => c.trim())
  const headerIdx = cells.findIndex((c) => c.startsWith('Статус'))
  if (headerIdx >= 0) {
    statusIdx = headerIdx // колонка «Статус» берётся из заголовка таблицы; таблиц может быть несколько
    continue
  }
  const id = cells[1]
  if (!id || !ID_RE.test(id) || statusIdx < 0) continue
  rows.push({ id, status: cells[statusIdx] ?? '' })
}

const errors = []
const seen = new Set()
for (const { id, status } of rows) {
  if (seen.has(id)) errors.push(`${id}: номер повторяется`)
  seen.add(id)
  if (!STATUSES.some((s) => status.startsWith(s)))
    errors.push(`${id}: статус «${status}» не из списка: ${STATUSES.join(', ')}`)
}

function* files(path) {
  let st
  try {
    st = statSync(path)
  } catch {
    return
  }
  if (st.isFile()) {
    yield path
    return
  }
  for (const name of readdirSync(path)) {
    if (!SKIP_DIRS.has(name)) yield* files(join(path, name))
  }
}
const corpus = [...scanPaths]
  .flatMap((p) => [...files(p)])
  .map((f) => readFileSync(f, 'utf8'))
  .join('\n')
const unreferenced = rows
  .filter(({ status }) => ['в ТЗ', 'в работе', 'сделан'].some((s) => status.startsWith(s)))
  .filter(({ id }) => !new RegExp(`(^|[^A-Za-z0-9-])${id}(?![A-Za-z0-9-])`, 'm').test(corpus))
  .map(({ id }) => id)

console.log(
  `Реестр ${register}: ${rows.length} требований, ошибок ${errors.length}, без ссылки в ${scanPaths.join(', ')}: ${unreferenced.length}`,
)
for (const e of errors) console.log(`  ошибка: ${e}`)
if (unreferenced.length) console.log(`  без ссылки: ${unreferenced.join(' ')}`)
process.exit(errors.length || (flag('--strict') && unreferenced.length) ? 1 : 0)
