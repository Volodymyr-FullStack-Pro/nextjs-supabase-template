#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import { gzipSync } from 'node:zlib'

const DEFAULT_LIMIT_KB = 300
const TOLERANCE_KB = 2
const BYTES_IN_KB = 1024
const APP_DIRECTORY = '.next/server/app'
const SERVER_DIRECTORY = '.next/server'
const ROUTES_MANIFEST = '.next/server/app-paths-manifest.json'
const BUILD_MANIFEST = '.next/build-manifest.json'
const BASELINE_FILE = 'perf-baseline.json'
const UPDATE_COMMAND = 'npm run budget -- --update-baseline'
const PRERENDERED_HTML = 'html'
const BUILD_MANIFESTS = 'manifest'
const SOURCES = [PRERENDERED_HTML, BUILD_MANIFESTS]

const fail = (message) => {
  console.error(message)
  process.exit(1)
}

const args = process.argv.slice(2)
const flagValue = (flag) => (args.includes(flag) ? (args[args.indexOf(flag) + 1] ?? '') : undefined)
const limitKb = Number(flagValue('--limit') ?? DEFAULT_LIMIT_KB)
const source = flagValue('--source') ?? PRERENDERED_HTML
const updateBaseline = args.includes('--update-baseline')
if (!Number.isFinite(limitKb) || limitKb <= 0)
  fail('Неверный лимит: npm run budget -- --limit <КБ>')
if (!SOURCES.includes(source)) fail(`Неверный источник: --source ${SOURCES.join(' | ')}`)
if (!existsSync(APP_DIRECTORY)) fail('Нет сборки: сначала npm run build')

const readJson = (file) => JSON.parse(readFileSync(file, 'utf8'))

const sizes = new Map()
const gzipKb = (url) => {
  const file = join('.next', url.replace(/^\/_next\//, ''))
  if (!sizes.has(file)) {
    if (!existsSync(file))
      fail(`Скрипт страницы не найден в сборке: ${file} — пересоберите: npm run build`)
    sizes.set(file, gzipSync(readFileSync(file)).length / BYTES_IN_KB)
  }
  return sizes.get(file)
}

const pages = existsSync(ROUTES_MANIFEST)
  ? Object.entries(readJson(ROUTES_MANIFEST))
      .filter(([key]) => key.endsWith('/page'))
      .map(([key, file]) => ({
        key,
        file,
        route: key.replace(/\/page$/, '').replaceAll(/\/\([^)]+\)/g, '') || '/',
      }))
  : []

const scriptUrls = (html) => {
  const tags = html.match(/<script\b[^>]*\bsrc="\/_next\/static\/[^"]+\.js"[^>]*>/g) ?? []
  const urls = tags
    .filter((tag) => !/\bnomodule\b/.test(tag))
    .map((tag) => /src="([^"]+)"/.exec(tag)?.[1])
    .filter(Boolean)
  return [...new Set(urls)]
}

const htmlRoutes = () => {
  const routes = []
  const walk = (directory, prefix = '') => {
    for (const name of readdirSync(directory)) {
      const full = join(directory, name)
      if (statSync(full).isDirectory()) walk(full, `${prefix}/${name}`)
      else if (name.endsWith('.html')) {
        const route = `${prefix}/${basename(name, '.html')}`.replace(/\/index$/, '') || '/'
        routes.push({ route, scripts: scriptUrls(readFileSync(full, 'utf8')) })
      }
    }
  }
  walk(APP_DIRECTORY)
  return routes
}

const segmentFiles = (manifestFile, key) => {
  if (!existsSync(manifestFile)) return []
  const code = readFileSync(manifestFile, 'utf8')
  const assignment = `__RSC_MANIFEST[${JSON.stringify(key)}]`
  const assignmentStart = code.indexOf(assignment)
  if (assignmentStart === -1) return []
  const jsonStart = code.indexOf('{', assignmentStart + assignment.length)
  try {
    const manifest = JSON.parse(code.slice(jsonStart, code.lastIndexOf('}') + 1))
    return Object.values(manifest.entryJSFiles ?? {}).flat()
  } catch {
    return []
  }
}

const manifestRoutes = () => {
  if (pages.length === 0 || !existsSync(BUILD_MANIFEST)) {
    fail(`Нет манифестов сборки (${ROUTES_MANIFEST}, ${BUILD_MANIFEST}): сначала npm run build`)
  }
  const { rootMainFiles = [], polyfillFiles = [] } = readJson(BUILD_MANIFEST)
  return pages.map(({ key, file, route }) => {
    const ownFiles = segmentFiles(
      join(SERVER_DIRECTORY, file.replace(/\.js$/, '_client-reference-manifest.js')),
      key,
    )
    const files = ownFiles.length > 0 ? [...rootMainFiles, ...polyfillFiles, ...ownFiles] : []
    return { route, scripts: [...new Set(files)].map((name) => `/_next/${name}`) }
  })
}

const statusFor = ({ total, delta, scripts }) => {
  if (scripts.length === 0) return '✘ нет JS'
  if (total > limitKb) return '✘ лимит'
  if (delta === null) return updateBaseline ? '+ в базу' : '✘ новый'
  if (delta > TOLERANCE_KB) return '✘ рост'
  if (delta < -TOLERANCE_KB) return '✓ лучше'
  return '✓'
}
const deltaTextFor = (delta) => {
  if (delta === null) return 'нет в базе'
  return `${delta >= 0 ? '+' : ''}${String(delta)} КБ к базе`
}

const baseline = existsSync(BASELINE_FILE) ? readJson(BASELINE_FILE) : {}
const measured = (source === BUILD_MANIFESTS ? manifestRoutes() : htmlRoutes())
  .toSorted((left, right) => left.route.localeCompare(right.route))
  .map(({ route, scripts }) => {
    const total = Math.round(scripts.reduce((sum, url) => sum + gzipKb(url), 0))
    return {
      route,
      scripts,
      total,
      delta: baseline[route] === undefined ? null : total - baseline[route],
    }
  })

console.log(
  `Бюджет JS на маршрут: лимит ${String(limitKb)} КБ gzip, база — ${BASELINE_FILE}, источник — ${source}`,
)
for (const row of measured) {
  console.log(
    `  ${statusFor(row).padEnd(8)} ${row.route.padEnd(22)} ${String(row.total).padStart(4)} КБ  (${String(row.scripts.length)} скриптов, ${deltaTextFor(row.delta)})`,
  )
}

const measuredRoutes = new Set(measured.map(({ route }) => route))
const withoutHtml = pages.map(({ route }) => route).filter((route) => !measuredRoutes.has(route))
const withoutScripts = measured
  .filter(({ scripts }) => scripts.length === 0)
  .map(({ route }) => route)
const overLimit = measured.some(({ total }) => total > limitKb)
const grew = measured.some(({ delta }) => delta !== null && delta > TOLERANCE_KB)
const newRoutes = measured.filter(({ delta }) => delta === null).map(({ route }) => route)
const staleRoutes = Object.keys(baseline).filter((route) => !measuredRoutes.has(route))
for (const route of withoutHtml) console.log(`  ✘ без HTML ${route}`)
for (const route of staleRoutes)
  console.log(`  ✘ нет в сборке ${route} (запись в ${BASELINE_FILE})`)

if (withoutHtml.length > 0) {
  fail(
    'Страница без HTML не измерена: дайте ей статическую оболочку (динамика — под <Suspense>), иначе её JS не проверяется',
  )
}
if (withoutScripts.length > 0) {
  fail(
    source === BUILD_MANIFESTS
      ? `В манифестах сборки нет скриптов страницы (${withoutScripts.join(', ')}): формат .next изменился — сверьте scripts/bundle-budget.mjs с установленной версией Next. 0 КБ — не результат, база не обновлена.`
      : [
          `У страницы нет измеримого HTML (${withoutScripts.join(', ')}): в пререндере нет ни одного скрипта. 0 КБ — не результат, а отсутствие замера; база не обновлена.`,
          '  Одна страница: верните ей статическую оболочку (динамика — под <Suspense>).',
          '  Все страницы — корневой layout рендерится на каждый запрос (CSP с nonce, B00-T07): бюджет считается по манифестам сборки,',
          '  в package.json — "budget": "node scripts/bundle-budget.mjs --source manifest". База и лимит те же, числа совпадают с HTML.',
        ].join('\n'),
  )
}
if (updateBaseline) {
  const current = Object.fromEntries(measured.map(({ route, total }) => [route, total]))
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
    `JS вырос относительно базы. Если рост оправдан (новый экран, библиотека по решению), обновите базу: ${UPDATE_COMMAND} и объясните в PR`,
  )
}
if (newRoutes.length > 0) {
  console.log(
    `Маршрута нет в ${BASELINE_FILE}: ${newRoutes.join(', ')}. Новый экран не проходит без записи: посмотрите его размер выше (состав — npm run analyze), затем запишите базу: ${UPDATE_COMMAND} — и закоммитьте ${BASELINE_FILE} в том же PR с объяснением`,
  )
}
if (staleRoutes.length > 0) {
  console.log(
    `В ${BASELINE_FILE} остался маршрут, которого нет в сборке: ${staleRoutes.join(', ')}. Уберите запись: ${UPDATE_COMMAND}`,
  )
}
process.exit(overLimit || grew || newRoutes.length > 0 || staleRoutes.length > 0 ? 1 : 0)
