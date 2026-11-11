#!/usr/bin/env node
import { execFileSync, spawnSync } from 'node:child_process'
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { dirname, join, relative } from 'node:path'

const TEMPLATE_ROOT = join(import.meta.dirname, 'module-template')
const MIGRATIONS = 'supabase/migrations'
const DATABASE_TESTS = 'supabase/tests'
const E2E_TESTS = 'tests/e2e'
const QUALITY_SPEC = 'tests/e2e/ui-quality.spec.ts'
const E2E_USERS = 'tests/e2e/support/users.ts'
const SPEED_PAGES = 'tests/perf/pages.ts'
const SPEED_PAGES_END = /(export const MEASURED_PAGES\b[^=]*= \[\n[\s\S]*?\n)\]\n/u
const KEBAB = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/u
const PLACEHOLDER =
  /__(module-name|module_name|moduleName|ModuleName|MODULE_NAME|entity-name|entity_name|entityName|EntityName|ENTITY_NAME)__/gu
const UNKNOWN_PLACEHOLDER = /__(?:module|entity)[-_a-z]*__/iu
const NUMBERED_TEST = /^(\d{3})-/u
const FIRST_TABLE_TEST = 100
const SHARED_TESTS_FROM = 900
const TEST_NUMBER_WIDTH = 3
const TABLE_NAME_MAX = 28
const RESERVED_WORDS = new Set(
  'break case catch class const continue debugger default delete do else enum export extends false finally for function if import in instanceof new null return super switch this throw true try typeof var void while with yield let static await'.split(
    ' ',
  ),
)

const fail = (message) => {
  console.error(message)
  process.exit(1)
}

const [moduleName, entityName] = process.argv.slice(2)
if (!moduleName || !entityName || !KEBAB.test(moduleName) || !KEBAB.test(entityName)) {
  fail(
    'Использование: npm run new:module <модуль> <запись> — модуль во множественном числе, запись в единственном; строчные буквы, цифры, дефис (businesses business, bank-accounts bank-account)',
  )
}
if (moduleName === entityName) {
  fail(
    `Имя записи совпадает с именем модуля «${moduleName}»: модуль и одна его запись называются по-разному (equipment equipment-item)`,
  )
}

const casings = (kebab) => {
  const words = kebab.split('-')
  const pascal = words.map((word) => word[0].toUpperCase() + word.slice(1)).join('')
  return {
    kebab,
    snake: words.join('_'),
    camel: pascal[0].toLowerCase() + pascal.slice(1),
    pascal,
    constant: words.join('_').toUpperCase(),
  }
}
const names = { module: casings(moduleName), entity: casings(entityName) }
const table = names.module.snake
const replacements = Object.fromEntries(
  Object.entries(names).flatMap(([kind, forms]) => [
    [`${kind}-name`, forms.kebab],
    [`${kind}_name`, forms.snake],
    [`${kind}Name`, forms.camel],
    [`${casings(kind).pascal}Name`, forms.pascal],
    [`${kind.toUpperCase()}_NAME`, forms.constant],
  ]),
)
const render = (text) => text.replaceAll(PLACEHOLDER, (_, key) => replacements[key])

for (const forms of Object.values(names)) {
  if (RESERVED_WORDS.has(forms.camel)) {
    fail(
      `«${forms.kebab}» — зарезервированное слово JavaScript: в коде оно станет именем переменной. Назовите иначе (imports import-batch)`,
    )
  }
}
if (table.length > TABLE_NAME_MAX) {
  fail(
    `Имя таблицы ${table} длиннее ${String(TABLE_NAME_MAX)} символов: имя ограничения ключа повтора не поместится в 63 символа Postgres`,
  )
}

const templateFiles = (directory) =>
  readdirSync(directory).flatMap((entry) => {
    const full = join(directory, entry)
    return statSync(full).isDirectory() ? templateFiles(full) : [full]
  })

const routeSegmentExists = (directory) =>
  readdirSync(directory).some((entry) => {
    const full = join(directory, entry)
    if (!statSync(full).isDirectory()) return false
    return entry === moduleName || (entry.startsWith('(') && routeSegmentExists(full))
  })

const rendered = templateFiles(TEMPLATE_ROOT).map((file) => ({
  path: render(relative(TEMPLATE_ROOT, file)),
  content: render(readFileSync(file, 'utf8')),
}))
const unknown = rendered.find(({ path, content }) =>
  UNKNOWN_PLACEHOLDER.test(`${path}\n${content}`),
)
if (unknown) {
  fail(
    `В шаблоне ${unknown.path} осталась неизвестная метка ${UNKNOWN_PLACEHOLDER.exec(`${unknown.path}\n${unknown.content}`)?.[0] ?? ''}: список меток — PLACEHOLDER в scripts/new-module.mjs`,
  )
}

const migrationTemplate = `${MIGRATIONS}/${table}.sql`
const databaseTestTemplate = `${DATABASE_TESTS}/${moduleName}.sql`
const tableFiles = (directory, suffix) =>
  readdirSync(directory).filter((file) => file.endsWith(suffix))
const taken = [
  ...[
    `src/modules/${moduleName}`,
    `src/app/${moduleName}`,
    `tests/unit/modules/${moduleName}`,
    `${E2E_TESTS}/${moduleName}.spec.ts`,
    `${E2E_TESTS}/${moduleName}-quality.spec.ts`,
  ].filter((path) => existsSync(path)),
  ...tableFiles(MIGRATIONS, `_${table}.sql`).map((file) => `${MIGRATIONS}/${file}`),
  ...tableFiles(DATABASE_TESTS, `-${moduleName}.sql`).map((file) => `${DATABASE_TESTS}/${file}`),
]
if (taken.length > 0 || routeSegmentExists('src/app')) {
  fail(
    `Имя «${moduleName}» уже занято: ${taken.join(', ') || `маршрут /${moduleName} в src/app`}. Выберите другое.`,
  )
}

const createMigration = () => {
  const before = new Set(readdirSync(MIGRATIONS))
  try {
    execFileSync('node', [join(import.meta.dirname, 'db-new.mjs'), table], {
      stdio: ['ignore', 'ignore', 'inherit'],
    })
  } catch {
    fail(
      `Миграция ${table} не создана (scripts/db-new.mjs): нужен Supabase CLI в PATH. Файлы среза не записаны.`,
    )
  }
  const created = readdirSync(MIGRATIONS).find((file) => !before.has(file))
  if (!created) fail(`scripts/db-new.mjs не создал миграцию ${table} в ${MIGRATIONS}`)
  return `${MIGRATIONS}/${created}`
}

const nextDatabaseTest = () => {
  const numbers = readdirSync(DATABASE_TESTS)
    .map((file) => Number.parseInt(NUMBERED_TEST.exec(file)?.[1] ?? '', 10))
    .filter((number) => number >= FIRST_TABLE_TEST && number < SHARED_TESTS_FROM)
  const next = Math.max(FIRST_TABLE_TEST - 1, ...numbers) + 1
  return `${DATABASE_TESTS}/${String(next).padStart(TEST_NUMBER_WIDTH, '0')}-${moduleName}.sql`
}

const appendToList = (file, constant, value) => {
  if (!existsSync(file)) return false
  const list = new RegExp(String.raw`(const ${constant}\b[^=]*= \[)([^\]]*)\]`, 'u')
  const source = readFileSync(file, 'utf8')
  if (!list.test(source)) return false
  writeFileSync(
    file,
    source.replace(list, (_, start, items) => {
      const kept = items.trim().replace(/,$/u, '')
      return `${start}${kept === '' ? '' : `${kept}, `}'${value}']`
    }),
  )
  return true
}

const measuredPage = (route) => `  {
    path: '${route}',
    signedIn: true,
    seed: {
      table: '${table}',
      sqlByColumn: {
        title: \`'\${SEEDED_TEXT} ' || n\`,
        amount: 'n + 0.5',
        currency: \`'EUR'\`,
        client_request_id: 'gen_random_uuid()',
        created_at: \`now() - n * interval '1 minute'\`,
      },
      textOnScreen: SEEDED_TEXT,
    },
  },
`

const appendMeasuredPage = (route) => {
  if (!existsSync(SPEED_PAGES)) return false
  const source = readFileSync(SPEED_PAGES, 'utf8')
  if (!SPEED_PAGES_END.test(source)) return false
  writeFileSync(
    SPEED_PAGES,
    source.replace(SPEED_PAGES_END, (_, pages) => `${pages}${measuredPage(route)}]\n`),
  )
  return true
}

const written = []
for (const { path, content } of rendered) {
  if (path === migrationTemplate) {
    const migration = createMigration()
    appendFileSync(migration, content)
    written.push(migration)
    continue
  }
  const target = path === databaseTestTemplate ? nextDatabaseTest() : path
  mkdirSync(dirname(target), { recursive: true })
  writeFileSync(target, content)
  written.push(target)
}

const route = `/${moduleName}`
const registries = [
  ...[
    { file: QUALITY_SPEC, constant: 'SIGNED_IN_PAGES', value: route, what: `страница ${route}` },
    { file: E2E_USERS, constant: 'OWNED_TABLES', value: table, what: `таблица ${table}` },
  ].map((registry) => ({
    ...registry,
    done: appendToList(registry.file, registry.constant, registry.value),
  })),
  {
    file: SPEED_PAGES,
    constant: 'MEASURED_PAGES',
    value: route,
    what: `страница ${route} с объёмом данных для замера скорости`,
    done: appendMeasuredPage(route),
  },
]

const code = [
  ...written.filter((path) => !path.endsWith('.sql')),
  ...registries.filter(({ done }) => done).map(({ file }) => file),
]
spawnSync('npx', ['eslint', '--fix', '--fix-type', 'layout', ...code], { stdio: 'ignore' })
execFileSync('npx', ['prettier', '--write', '--log-level', 'warn', ...code], { stdio: 'inherit' })

const lines = written
  .map((path) => readFileSync(path, 'utf8').split('\n').length - 1)
  .reduce((sum, count) => sum + count, 0)
for (const path of written.toSorted()) console.log(`  + ${path}`)
for (const { file, constant, value, what, done } of registries) {
  console.log(
    done
      ? `  ~ ${file}: ${what} добавлена в ${constant}`
      : `  ! ${file}: список ${constant} не найден — добавьте в него '${value}' руками`,
  )
}
const unitTests = `tests/unit/modules/${moduleName}`
const specs = `${E2E_TESTS}/${moduleName}.spec.ts ${E2E_TESTS}/${moduleName}-quality.spec.ts`
console.log(`
Срез ${moduleName} создан: ${String(written.length)} файлов, ${String(lines)} строк. Это рабочий образец с полями title, amount, currency;
npm run gate пройдёт после двух шагов, которые генератор за вас не делает (нужны запущенная база и сборка):
  1. supabase migration up && npm run db:types          — таблица в локальной базе и её типы; до этого typecheck красный
  2. npm run build && npm run budget -- --update-baseline  — маршрут ${route} в perf-baseline.json
Дальше — под сущность, тремя задачами (.claude/rules/docs.md): база и pgTAP → ядро и unit (${unitTests}) → экран и e2e (${specs}).
Замер скорости (npm run perf) меряет ${route} на 50 тыс. строк по записи в ${SPEED_PAGES}: поменяли поля таблицы —
поправьте там выражения колонок (sqlByColumn) и текст из этих строк, который страница показывает (textOnScreen).
Поля в миграции меняются до supabase migration up; если она уже применена — supabase db reset.
Тексты заготовки: заголовок «Название раздела» в src/app/${moduleName}/page.tsx, подписи формы и словарь ui/messages.ts.`)
