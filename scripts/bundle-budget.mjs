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
if (!Number.isFinite(limitKb) || limitKb <= 0) fail('Invalid limit: npm run budget -- --limit <KB>')
if (!SOURCES.includes(source)) fail(`Invalid source: --source ${SOURCES.join(' | ')}`)
if (!existsSync(APP_DIRECTORY)) fail('No build: run npm run build first')

const readJson = (file) => JSON.parse(readFileSync(file, 'utf8'))

const sizes = new Map()
const gzipKb = (url) => {
  const file = join('.next', url.replace(/^\/_next\//, ''))
  if (!sizes.has(file)) {
    if (!existsSync(file))
      fail(`Page script not found in the build: ${file}; rebuild with npm run build`)
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
    fail(`No build manifests (${ROUTES_MANIFEST}, ${BUILD_MANIFEST}): run npm run build first`)
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
  if (scripts.length === 0) return '✘ no JS'
  if (total > limitKb) return '✘ limit'
  if (delta === null) return updateBaseline ? '+ baseline' : '✘ new'
  if (delta > TOLERANCE_KB) return '✘ grew'
  if (delta < -TOLERANCE_KB) return '✓ better'
  return '✓'
}
const deltaTextFor = (delta) => {
  if (delta === null) return 'not in baseline'
  return `${delta >= 0 ? '+' : ''}${String(delta)} KB vs baseline`
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
  `JS budget per route: limit ${String(limitKb)} KB gzip, baseline ${BASELINE_FILE}, source ${source}`,
)
for (const row of measured) {
  console.log(
    `  ${statusFor(row).padEnd(8)} ${row.route.padEnd(22)} ${String(row.total).padStart(4)} KB  (${String(row.scripts.length)} scripts, ${deltaTextFor(row.delta)})`,
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
for (const route of withoutHtml) console.log(`  ✘ no HTML ${route}`)
for (const route of staleRoutes)
  console.log(`  ✘ not in build ${route} (entry in ${BASELINE_FILE})`)

if (withoutHtml.length > 0) {
  fail(
    'A page without HTML is not measured: give it a static shell (dynamic parts under <Suspense>), otherwise its JS is not checked',
  )
}
if (withoutScripts.length > 0) {
  fail(
    source === BUILD_MANIFESTS
      ? `Build manifests list no page scripts (${withoutScripts.join(', ')}): the .next format changed; align scripts/bundle-budget.mjs with the installed Next. 0 KB is not a result; the baseline is not updated.`
      : [
          `No measurable HTML (${withoutScripts.join(', ')}): the prerender has no scripts. 0 KB means no measurement; the baseline is not updated.`,
          '  One page: give it back a static shell (dynamic parts under <Suspense>).',
          '  All pages: the root layout renders per request (CSP nonce, B00-T07), so measure from the build manifests,',
          '  in package.json "budget": "node scripts/bundle-budget.mjs --source manifest". Same baseline and limit; the numbers match HTML.',
        ].join('\n'),
  )
}
if (updateBaseline) {
  const current = Object.fromEntries(measured.map(({ route, total }) => [route, total]))
  writeFileSync(BASELINE_FILE, `${JSON.stringify(current, null, 2)}\n`)
  console.log(`Baseline updated: ${BASELINE_FILE} (commit it with the change)`)
  process.exit(0)
}
if (overLimit) {
  console.log(
    'Over the limit: move heavy parts to next/dynamic, do not import server modules into the client; see npm run analyze',
  )
}
if (grew) {
  console.log(
    `JS grew against the baseline. If the growth is justified (a new screen, an approved library), update the baseline with ${UPDATE_COMMAND} and explain it in the PR`,
  )
}
if (newRoutes.length > 0) {
  console.log(
    `Route missing from ${BASELINE_FILE}: ${newRoutes.join(', ')}. A new screen needs an entry: check its size above (contents: npm run analyze), record it with ${UPDATE_COMMAND} and commit ${BASELINE_FILE} in the same PR with an explanation`,
  )
}
if (staleRoutes.length > 0) {
  console.log(
    `${BASELINE_FILE} has a route missing from the build: ${staleRoutes.join(', ')}. Remove it with ${UPDATE_COMMAND}`,
  )
}
process.exit(overLimit || grew || newRoutes.length > 0 || staleRoutes.length > 0 ? 1 : 0)
