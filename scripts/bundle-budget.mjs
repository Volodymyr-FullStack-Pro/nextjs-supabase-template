#!/usr/bin/env node
// Бюджет JavaScript на маршрут: сумма gzip-размеров скриптов из предрендеренного HTML каждой страницы
// (.next/server/app/*.html). Считает только начальную загрузку, без префетча ссылок (в отличие от Lighthouse).
// Два порога: лимит (граница) и база perf-baseline.json (храповик: рост относительно базы — тоже ошибка,
// пока базу не обновили осознанно). Лимит — не цель: цель — не ухудшать, а улучшать.
// Запуск после next build: npm run budget [-- --limit 300] [--update-baseline]
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import { gzipSync } from 'node:zlib'

const DEFAULT_LIMIT_KB = 300
const TOLERANCE_KB = 2 // шум минификации; всё, что больше, — рост
const BYTES_IN_KB = 1024
const APP_DIRECTORY = '.next/server/app'
const BASELINE_FILE = 'perf-baseline.json'

const args = process.argv.slice(2)
const limitKb = Number(args[args.indexOf('--limit') + 1] || DEFAULT_LIMIT_KB)
const updateBaseline = args.includes('--update-baseline')
if (!existsSync(APP_DIRECTORY)) {
  console.error('Нет сборки: сначала npm run build')
  process.exit(1)
}

const sizes = new Map()
const gzipKb = (url) => {
  const file = join('.next', url.replace(/^\/_next\//, ''))
  if (!sizes.has(file)) {
    sizes.set(file, existsSync(file) ? gzipSync(readFileSync(file)).length / BYTES_IN_KB : 0)
  }
  return sizes.get(file)
}

const routes = []
const walk = (directory, prefix = '') => {
  for (const name of readdirSync(directory)) {
    const full = join(directory, name)
    if (statSync(full).isDirectory()) walk(full, `${prefix}/${name}`)
    else if (name.endsWith('.html')) {
      const route = `${prefix}/${basename(name, '.html')}`.replace(/\/index$/, '') || '/'
      routes.push({ route, file: full })
    }
  }
}
walk(APP_DIRECTORY)

const statusFor = (total, delta) => {
  if (total > limitKb) return '✘ лимит'
  if (delta === null) return '✓'
  if (delta > TOLERANCE_KB) return '✘ рост'
  if (delta < -TOLERANCE_KB) return '✓ лучше'
  return '✓'
}
const scriptUrls = (html) => [
  ...new Set(
    [...html.matchAll(/<script[^>]+src="(\/_next\/static\/[^"]+\.js)"/g)].map((match) => match[1]),
  ),
]

const baseline = existsSync(BASELINE_FILE) ? JSON.parse(readFileSync(BASELINE_FILE, 'utf8')) : {}
const current = {}
let overLimit = false
let grew = false
console.log(`Бюджет JS на маршрут: лимит ${String(limitKb)} КБ gzip, база — ${BASELINE_FILE}`)
for (const { route, file } of routes.sort((left, right) => left.route.localeCompare(right.route))) {
  const scripts = scriptUrls(readFileSync(file, 'utf8'))
  const total = Math.round(scripts.reduce((sum, url) => sum + gzipKb(url), 0))
  current[route] = total
  const delta = baseline[route] === undefined ? null : total - baseline[route]
  if (total > limitKb) overLimit = true
  if (delta !== null && delta > TOLERANCE_KB) grew = true
  const deltaText =
    delta === null ? 'новый маршрут' : `${delta >= 0 ? '+' : ''}${String(delta)} КБ к базе`
  console.log(
    `  ${statusFor(total, delta).padEnd(8)} ${route.padEnd(22)} ${String(total).padStart(4)} КБ  (${String(scripts.length)} скриптов, ${deltaText})`,
  )
}

if (updateBaseline) {
  writeFileSync(BASELINE_FILE, `${JSON.stringify(current, null, 2)}\n`)
  console.log(`База обновлена: ${BASELINE_FILE} (закоммитьте вместе с изменением)`)
  process.exit(0)
}
if (overLimit) {
  console.log(
    'Превышен лимит: вынесите тяжёлое в next/dynamic, не импортируйте серверные модули в клиент, см. npm run analyze',
  )
}
if (grew) {
  console.log(
    'JS вырос относительно базы. Если рост оправдан (новый экран, библиотека по решению), обновите базу: npm run budget -- --update-baseline и объясните в PR',
  )
}
process.exit(overLimit || grew ? 1 : 0)
