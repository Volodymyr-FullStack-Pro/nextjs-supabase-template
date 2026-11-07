#!/usr/bin/env node
// Бюджет JavaScript на маршрут: сумма gzip-размеров скриптов из предрендеренного HTML каждой страницы
// (.next/server/app/*.html). Считает только начальную загрузку, без префетча ссылок (в отличие от Lighthouse).
// Запуск после next build: npm run budget [-- --limit 300]  (лимит в КБ gzip; по умолчанию 300)
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, basename } from 'node:path'
import { gzipSync } from 'node:zlib'

const args = process.argv.slice(2)
const limitKb = Number(args[args.indexOf('--limit') + 1] || 300)
const appDir = '.next/server/app'
if (!existsSync(appDir)) {
  console.error('Нет сборки: сначала npm run build')
  process.exit(1)
}

const sizes = new Map()
const gzipKb = (url) => {
  const file = join('.next', url.replace(/^\/_next\//, ''))
  if (!sizes.has(file))
    sizes.set(file, existsSync(file) ? gzipSync(readFileSync(file)).length / 1024 : 0)
  return sizes.get(file)
}
const routes = []
const walk = (dir, prefix = '') => {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) walk(full, `${prefix}/${name}`)
    else if (name.endsWith('.html'))
      routes.push({
        route: `${prefix}/${basename(name, '.html')}`.replace(/\/index$/, '/') || '/',
        file: full,
      })
  }
}
walk(appDir)

let failed = false
console.log(`Бюджет JS на маршрут: ${String(limitKb)} КБ gzip (начальная загрузка)`)
for (const { route, file } of routes.sort((a, b) => a.route.localeCompare(b.route))) {
  const html = readFileSync(file, 'utf8')
  const scripts = [
    ...new Set(
      [...html.matchAll(/<script[^>]+src="(\/_next\/static\/[^"]+\.js)"/g)].map((m) => m[1]),
    ),
  ]
  const total = scripts.reduce((sum, url) => sum + gzipKb(url), 0)
  const over = total > limitKb
  if (over) failed = true
  console.log(
    `  ${over ? '✘' : '✓'} ${route.padEnd(24)} ${total.toFixed(0).padStart(4)} КБ  (${String(scripts.length)} скриптов)`,
  )
}
if (failed) {
  console.log(
    'Превышение бюджета: вынесите тяжёлое в next/dynamic, не импортируйте серверные модули в клиент, проверьте npm run analyze',
  )
  process.exit(1)
}
