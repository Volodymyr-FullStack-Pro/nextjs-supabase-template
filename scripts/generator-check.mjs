#!/usr/bin/env node
import { execFileSync, spawnSync } from 'node:child_process'
import { readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { connect } from 'node:net'

const MODULE = 'generator-probes'
const ENTITY = 'generator-probe'
const TABLE = 'generator_probes'
const ROUTE = `/${MODULE}`
const MIGRATIONS = 'supabase/migrations'
const DATABASE_TESTS = 'supabase/tests'
const BASELINE_FILE = 'perf-baseline.json'
const CHANGED_FILES = [
  'src/shared/infrastructure/supabase/types.ts',
  'tests/e2e/ui-quality.spec.ts',
  'tests/e2e/support/users.ts',
  BASELINE_FILE,
]
const CREATED_PATHS = [
  `src/modules/${MODULE}`,
  `src/app/${MODULE}`,
  `tests/unit/modules/${MODULE}`,
  `tests/e2e/${MODULE}.spec.ts`,
  `tests/e2e/${MODULE}-quality.spec.ts`,
]
const E2E_PORTS = [3100, 3101]
const PORT_PROBE_MS = 1000
const MS_IN_SECOND = 1000
const DROP_PROBE_TABLE = `do $$ begin drop table if exists public.${TABLE}; delete from supabase_migrations.schema_migrations where name = '${TABLE}'; perform pg_notify('pgrst', 'reload schema'); end $$;`

const seconds = (startedAt) => `${String(Math.round((Date.now() - startedAt) / MS_IN_SECOND))} с`

const run = (command, args) =>
  spawnSync(command, args, { stdio: 'inherit', env: process.env }).status === 0

const gitStatus = () => execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim()

const portIsBusy = (port) =>
  new Promise((resolve) => {
    const socket = connect({ port, host: 'localhost' })
    const answer = (busy) => {
      socket.destroy()
      resolve(busy)
    }
    socket.setTimeout(PORT_PROBE_MS, () => {
      answer(false)
    })
    socket.once('connect', () => {
      answer(true)
    })
    socket.once('error', () => {
      answer(false)
    })
  })

const tableFiles = (directory, suffix) =>
  readdirSync(directory)
    .filter((file) => file.endsWith(suffix))
    .map((file) => `${directory}/${file}`)

const readJson = (file) => JSON.parse(readFileSync(file, 'utf8'))

const acceptNewRoute = () => {
  const baseline = readJson(BASELINE_FILE)
  if (!run('npm', ['run', 'budget', '--', '--update-baseline'])) return false
  const measured = readJson(BASELINE_FILE)
  writeFileSync(
    BASELINE_FILE,
    `${JSON.stringify({ ...baseline, [ROUTE]: measured[ROUTE] }, null, 2)}\n`,
  )
  return run('npm', ['run', 'budget'])
}

const steps = [
  ['генератор', () => run('node', ['scripts/new-module.mjs', MODULE, ENTITY])],
  ['миграция в локальную базу', () => run('supabase', ['migration', 'up'])],
  ['типы базы', () => run('npm', ['run', 'db:types'])],
  ['линтер', () => run('npm', ['run', 'lint'])],
  ['самопроверка защит линтера', () => run('npm', ['run', 'lint:rules'])],
  ['типы', () => run('npm', ['run', 'typecheck'])],
  ['unit и пороги покрытия', () => run('npm', ['run', 'test:coverage'])],
  ['knip', () => run('npm', ['run', 'knip'])],
  ['jscpd', () => run('npm', ['run', 'jscpd'])],
  ['prettier', () => run('npm', ['run', 'format:check'])],
  ['advisors', () => run('supabase', ['db', 'advisors', '--fail-on', 'warn'])],
  ['db lint', () => run('supabase', ['db', 'lint', '--fail-on', 'warning'])],
  ['pgTAP', () => run('supabase', ['test', 'db'])],
  ['Squawk', () => run('npm', ['run', 'db:check-migrations', '--', 'HEAD'])],
  [
    'e2e на двух устройствах (собирает проект)',
    () => run('npm', ['run', 'test:e2e:db', '--', MODULE, 'ui-quality']),
  ],
  ['бюджет JS с новым маршрутом', acceptNewRoute],
]

const removeProbe = () => {
  const dropped = run('supabase', ['db', 'query', DROP_PROBE_TABLE])
  const created = [
    ...CREATED_PATHS,
    ...tableFiles(MIGRATIONS, `_${TABLE}.sql`),
    ...tableFiles(DATABASE_TESTS, `-${MODULE}.sql`),
  ]
  for (const path of created) rmSync(path, { recursive: true, force: true })
  return dropped
}

const restore = (originals) => {
  removeProbe()
  for (const [file, content] of originals) writeFileSync(file, content)
  run('npx', ['next', 'typegen'])
}

const precondition = async () => {
  const busy = await Promise.all(E2E_PORTS.map((port) => portIsBusy(port)))
  const busyPorts = E2E_PORTS.filter((_, index) => busy[index])
  if (busyPorts.length > 0) {
    return `Порт ${busyPorts.join(', ')} занят: остановите сервер — e2e должен собрать проект с новым модулем, а не взять работающую сборку`
  }
  if (!removeProbe()) {
    return 'Локальная база не отвечает: supabase start (в клоне — SUPABASE_PROJECT_ID=<имя папки оригинала>)'
  }
  return null
}

const signalsHandled = () => new Promise((resolve) => setImmediate(resolve))

let interrupted = false
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    interrupted = true
  })
}

const refusal = await precondition()
if (refusal !== null) {
  console.error(refusal)
  process.exit(1)
}

const originals = CHANGED_FILES.map((file) => [file, readFileSync(file)])
const treeBefore = gitStatus()
const startedAt = Date.now()
const report = []

const firstFailure = async ([current, ...rest]) => {
  if (current === undefined) return null
  const [name, step] = current
  const stepStartedAt = Date.now()
  console.log(`\n── ${name}`)
  const stepPassed = step()
  await signalsHandled()
  const passed = stepPassed && !interrupted
  report.push(`  ${passed ? '✓' : '✘'} ${name} — ${seconds(stepStartedAt)}`)
  return passed ? firstFailure(rest) : name
}

let failed = null
try {
  failed = await firstFailure(steps)
} finally {
  console.log('\n── уборка: таблица, файлы модуля, изменённые файлы')
  restore(originals)
}

const treeAfter = gitStatus()
const leftovers = treeAfter === treeBefore ? '' : treeAfter
console.log(`\nПроверка генератора (${MODULE}), ${seconds(startedAt)}:`)
console.log(report.join('\n'))
if (leftovers !== '') {
  console.error(
    `После уборки git status не тот, что до проверки, — генератор создал или изменил то, чего проверка не знает:\n${leftovers}`,
  )
}
if (interrupted) {
  console.error(
    `Проверка прервана на шаге «${failed ?? ''}»; файлы и база возвращены в состояние до проверки`,
  )
} else if (failed !== null) {
  console.error(
    `Срез из шаблонов scripts/module-template не проходит шаг «${failed}»: исправьте шаблон (или общий код, на который он опирается) и запустите снова`,
  )
}
if (failed === null && leftovers === '') {
  console.log(
    'Срез из шаблонов проходит все проверки; файлы и база возвращены в состояние до проверки',
  )
}
process.exit(failed === null && leftovers === '' ? 0 : 1)
