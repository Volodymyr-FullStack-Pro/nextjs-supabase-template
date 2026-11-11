#!/usr/bin/env node
import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { connect } from 'node:net'

const MODULE = 'generator-probes'
const ENTITY = 'generator-probe'
const TABLE = 'generator_probes'
const ROUTE = `/${MODULE}`
const PROBE_MARK = /generator[-_]probes/u
const SNAPSHOT_DIRECTORY = 'node_modules/.cache/generator-check'
const SNAPSHOT = `${SNAPSHOT_DIRECTORY}/snapshot.json`
const MIGRATIONS = 'supabase/migrations'
const DATABASE_TESTS = 'supabase/tests'
const BASELINE_FILE = 'perf-baseline.json'
const CHANGED_FILES = [
  'src/shared/infrastructure/supabase/types.ts',
  'tests/e2e/ui-quality.spec.ts',
  'tests/e2e/support/users.ts',
  'tests/perf/pages.ts',
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
const DATABASE_STATE = `select coalesce(json_agg(version order by version), '[]') as applied, to_regclass('public.${TABLE}') is not null as probe_table, coalesce(bool_or(name = '${TABLE}'), false) as probe_migration from supabase_migrations.schema_migrations`
const DROP_PROBE_TABLE = `do $$ begin drop table if exists public.${TABLE}; delete from supabase_migrations.schema_migrations where name = '${TABLE}'; perform pg_notify('pgrst', 'reload schema'); end $$;`

const seconds = (startedAt) => `${String(Math.round((Date.now() - startedAt) / MS_IN_SECOND))} с`

const run = (command, args, extraEnvironment = {}) =>
  spawnSync(command, args, { stdio: 'inherit', env: { ...process.env, ...extraEnvironment } })
    .status === 0

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

let databaseError = ''

const databaseState = () => {
  try {
    const output = execFileSync(
      'supabase',
      ['db', 'query', '--output-format', 'json', DATABASE_STATE],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
    )
    const json = output.slice(output.indexOf('{'), output.lastIndexOf('}') + 1)
    const row = JSON.parse(json).rows?.[0]
    if (row === undefined) databaseError = `нет строки в ответе: ${output.slice(0, 300)}`
    return row ?? null
  } catch (error) {
    databaseError = [error.message, error.stdout, error.stderr]
      .map((part) =>
        String(part ?? '')
          .trim()
          .slice(0, 400),
      )
      .filter((part) => part !== '')
      .join('\n  ')
    return null
  }
}

const probeTableFiles = () => [
  ...tableFiles(MIGRATIONS, `_${TABLE}.sql`),
  ...tableFiles(DATABASE_TESTS, `-${MODULE}.sql`),
]

const saveSnapshot = (snapshot) => {
  mkdirSync(SNAPSHOT_DIRECTORY, { recursive: true })
  writeFileSync(SNAPSHOT, JSON.stringify(snapshot))
}

const takeSnapshot = () => {
  const snapshot = {
    files: Object.fromEntries(
      CHANGED_FILES.map((file) => [file, readFileSync(file).toString('base64')]),
    ),
    created: CREATED_PATHS,
  }
  saveSnapshot(snapshot)
  return snapshot
}

const cleanUp = ({ files, created }) => {
  run('supabase', ['db', 'query', DROP_PROBE_TABLE])
  for (const path of created) rmSync(path, { recursive: true, force: true })
  for (const [file, content] of Object.entries(files))
    writeFileSync(file, Buffer.from(content, 'base64'))
  run('npx', ['next', 'typegen'])
  rmSync(SNAPSHOT, { force: true })
}

const hasProbeLines = (file) => PROBE_MARK.test(readFileSync(file, 'utf8'))

const leftoversOfProbe = (state) => [
  ...CREATED_PATHS.filter((path) => existsSync(path)),
  ...probeTableFiles(),
  ...CHANGED_FILES.filter((file) => hasProbeLines(file)).map(
    (file) => `строки ${MODULE} в ${file}`,
  ),
  ...(state.probe_table ? [`таблица public.${TABLE} в базе`] : []),
  ...(state.probe_migration ? [`запись ${TABLE} в supabase_migrations.schema_migrations`] : []),
]

const unappliedMigrations = (state) => {
  const applied = new Set(state.applied)
  const files = readdirSync(MIGRATIONS).filter((file) => file.endsWith('.sql'))
  const versions = new Set(files.map((file) => file.split('_')[0]))
  return [
    ...files.filter((file) => !applied.has(file.split('_')[0])),
    ...state.applied
      .filter((version) => !versions.has(version))
      .map((version) => `${version} (в базе, файла нет)`),
  ]
}

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
  [
    'генератор',
    () => {
      const generated = run('node', ['scripts/new-module.mjs', MODULE, ENTITY], {
        GENERATOR_CHECK: '1',
      })
      snapshot.created = [...CREATED_PATHS, ...probeTableFiles()]
      saveSnapshot(snapshot)
      return generated
    },
  ],
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
  [
    'замер скорости новой страницы на 50 тыс. строк',
    () => run('npm', ['run', 'perf', '--', '-g', ROUTE]),
  ],
]

const precondition = async () => {
  const busy = await Promise.all(E2E_PORTS.map((port) => portIsBusy(port)))
  const busyPorts = E2E_PORTS.filter((_, index) => busy[index])
  if (busyPorts.length > 0) {
    return `Порт ${busyPorts.join(', ')} занят: остановите сервер — e2e должен собрать проект с новым модулем, а не взять работающую сборку`
  }
  if (databaseState() === null) {
    return `Локальная база не отвечает: supabase start (в клоне — SUPABASE_PROJECT_ID=<имя папки оригинала>)\n  ${databaseError}`
  }
  if (existsSync(SNAPSHOT)) {
    console.log(
      `── прошлая проверка прервана до уборки: возвращаю файлы и базу по снимку ${SNAPSHOT}`,
    )
    const { files, created } = readJson(SNAPSHOT)
    const withProbeLines = Object.entries(files).filter(([file]) => hasProbeLines(file))
    cleanUp({ files: Object.fromEntries(withProbeLines), created })
  }
  const state = databaseState()
  if (state === null) return 'Локальная база не отвечает: supabase start'
  const leftovers = leftoversOfProbe(state)
  if (leftovers.length > 0) {
    return `Остатки прошлой проверки генератора без снимка ${SNAPSHOT} — проверка их не трогает:\n  ${leftovers.join('\n  ')}\nУберите их сами, свои правки в этих файлах сохраните (git diff)${state.probe_table || state.probe_migration ? `; таблицу и запись — supabase db reset или supabase db query "${DROP_PROBE_TABLE}"` : ''}`
  }
  const unapplied = unappliedMigrations(state)
  if (unapplied.length > 0) {
    return `Миграции файлов и базы расходятся: ${unapplied.join(', ')}. Сначала supabase migration up (или supabase db reset): иначе проверка применит их вместе с пробой и назовёт их ошибку ошибкой шаблона, а база после уборки не вернётся к прежней`
  }
  return null
}

const signalsHandled = () => new Promise((resolve) => setImmediate(resolve))

let interrupted = false
for (const stream of [process.stdout, process.stderr]) stream.on('error', () => {})
for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
  process.on(signal, () => {
    interrupted = true
  })
}

const refusal = await precondition()
if (refusal !== null) {
  console.error(refusal)
  process.exit(1)
}

const snapshot = takeSnapshot()
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
  cleanUp(snapshot)
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
    `Срез из шаблонов scripts/module-template не проходит шаг «${failed}»: исправьте шаблон (или общий код, на который он опирается${treeBefore === '' ? '' : ', или незакоммиченные правки в дереве'}) и запустите снова`,
  )
}
if (failed === null && leftovers === '') {
  console.log(
    'Срез из шаблонов проходит все проверки; файлы и база возвращены в состояние до проверки',
  )
}
process.exit(failed === null && leftovers === '' ? 0 : 1)
