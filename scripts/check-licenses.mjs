#!/usr/bin/env node
import { execFileSync } from 'node:child_process'

const STRONG_COPYLEFT = /(?<!L)A?GPL|SSPL|EUPL|OSL-|CPAL/u
const QUERY_BUFFER_BYTES = 64 * 1024 * 1024

const packages = JSON.parse(
  execFileSync('npm', ['query', '.prod'], { encoding: 'utf8', maxBuffer: QUERY_BUFFER_BYTES }),
)

const licenseOf = (entry) =>
  typeof entry.license === 'string' ? entry.license : (entry.license?.type ?? '')
const isForbidden = (license) =>
  license === '' ||
  license
    .replaceAll(/[()]/gu, '')
    .split(/\s+OR\s+/u)
    .every((alternative) => STRONG_COPYLEFT.test(alternative))

const dependencies = packages.filter((entry) => entry.location !== '')
const problems = dependencies
  .filter((entry) => isForbidden(licenseOf(entry)))
  .map((entry) => `${entry.name}@${entry.version}: ${licenseOf(entry) || 'лицензия не указана'}`)

if (problems.length > 0) {
  console.error(
    'Production-зависимости с запрещённой или неизвестной лицензией (GPL, AGPL, SSPL, EUPL):',
  )
  for (const problem of problems) console.error(`  ${problem}`)
  process.exit(1)
}
console.log(
  `Лицензии ${String(dependencies.length)} production-пакетов: без GPL, AGPL, SSPL и неизвестных`,
)
