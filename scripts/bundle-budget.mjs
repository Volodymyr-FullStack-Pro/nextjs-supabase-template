#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import { gzipSync } from 'node:zlib'

const DEFAULT_LIMIT_KB = 300
const TOLERANCE_KB = 2
const BYTES_IN_KB = 1024
const APP_DIRECTORY = '.next/server/app'
const ROUTES_MANIFEST = '.next/server/app-paths-manifest.json'
const BASELINE_FILE = 'perf-baseline.json'

const args = process.argv.slice(2)
const limitFlag = args.indexOf('--limit')
const limitKb = limitFlag >= 0 ? Number(args[limitFlag + 1]) : DEFAULT_LIMIT_KB
const updateBaseline = args.includes('--update-baseline')
if (!Number.isFinite(limitKb) || limitKb <= 0) {
  console.error('Неверный лимит: npm run budget -- --limit <КБ>')
  process.exit(1)
}
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

const scriptUrls = (html) => {
  const tags = html.match(/<script\b[^>]*\bsrc="\/_next\/static\/[^"]+\.js"[^>]*>/g) ?? []
  const urls = tags
    .filter((tag) => !/\bnomodule\b/.test(tag))
    .map((tag) => /src="([^"]+)"/.exec(tag)?.[1])
    .filter(Boolean)
  return [...new Set(urls)]
}
const statusFor = (total, delta) => {
  if (total > limitKb) return '✘ лимит'
  if (delta === null) return '✓'
  if (delta > TOLERANCE_KB) return '✘ рост'
  if (delta < -TOLERANCE_KB) return '✓ лучше'
  return '✓'
}

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

if (existsSync(ROUTES_MANIFEST)) {
  const measured = new Set(routes.map(({ route }) => route))
  const pages = Object.keys(JSON.parse(readFileSync(ROUTES_MANIFEST, 'utf8')))
    .filter((key) => key.endsWith('/page'))
    .map((key) => key.replace(/\/page$/, '').replaceAll(/\/\([^)]+\)/g, '') || '/')
  const skipped = pages.filter((route) => !measured.has(route))
  if (skipped.length > 0)
    console.log(`  (без HTML, не измерены: ${skipped.join(', ')} — добавьте статическую оболочку)`)
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
