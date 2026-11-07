#!/usr/bin/env node
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const STATUSES = ['открыт', 'получен', 'в ТЗ', 'сделан', 'отклонён', 'заменён']
const DONE_STATUSES = ['в ТЗ', 'сделан']
const ID_PATTERN = /^[A-Z]{1,2}-?\d{1,4}$/
const SKIP_DIRECTORIES = new Set([
  'node_modules',
  '.next',
  '.git',
  'coverage',
  'playwright-report',
  'test-results',
])
const DEFAULT_SCAN = ['docs/roadmap.md', 'docs/blocks', 'tests', 'src']

const args = process.argv.slice(2)
const flag = (name) => args.includes(name)
const values = (name) => {
  const out = []
  for (const [index, argument] of args.entries()) {
    if (argument !== name) continue
    for (let next = index + 1; next < args.length && !args[next].startsWith('--'); next += 1) {
      out.push(args[next])
    }
  }
  return out
}
const register = values('--register')[0] ?? 'docs/knowledge/requirements.md'
const scan = values('--scan')
const scanPaths = scan.length > 0 ? scan : DEFAULT_SCAN

const rows = []
let statusIndex = -1
for (const line of readFileSync(register, 'utf8').split('\n')) {
  if (!line.startsWith('|')) continue
  const cells = line.split('|').map((cell) => cell.trim())
  const headerIndex = cells.findIndex((cell) => cell.startsWith('Статус'))
  if (headerIndex >= 0) {
    statusIndex = headerIndex
    continue
  }
  const id = cells[1]
  if (!id || !ID_PATTERN.test(id) || statusIndex < 0) continue
  rows.push({ id, status: cells[statusIndex] ?? '' })
}

const errors = []
const seen = new Set()
for (const { id, status } of rows) {
  if (seen.has(id)) errors.push(`${id}: номер повторяется`)
  seen.add(id)
  if (!STATUSES.some((known) => status.startsWith(known))) {
    errors.push(`${id}: статус «${status}» не из списка: ${STATUSES.join(', ')}`)
  }
}

function* files(path) {
  let stats
  try {
    stats = statSync(path)
  } catch {
    return
  }
  if (stats.isFile()) {
    yield path
    return
  }
  for (const name of readdirSync(path)) {
    if (!SKIP_DIRECTORIES.has(name)) yield* files(join(path, name))
  }
}
const corpus = scanPaths
  .flatMap((path) => [...files(path)])
  .map((file) => readFileSync(file, 'utf8'))
  .join('\n')
const unreferenced = rows
  .filter(({ status }) => DONE_STATUSES.some((known) => status.startsWith(known)))
  .filter(({ id }) => !new RegExp(`(^|[^A-Za-z0-9-])${id}(?![A-Za-z0-9-])`, 'm').test(corpus))
  .map(({ id }) => id)

console.log(
  `Реестр ${register}: ${String(rows.length)} требований, ошибок ${String(errors.length)}, без ссылки в ${scanPaths.join(', ')}: ${String(unreferenced.length)}`,
)
for (const message of errors) console.log(`  ошибка: ${message}`)
if (unreferenced.length > 0) console.log(`  без ссылки: ${unreferenced.join(' ')}`)
const strictFailure = flag('--strict') && unreferenced.length > 0
process.exit(errors.length > 0 || strictFailure ? 1 : 0)
