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

import { namesTakenByTemplates } from './template-names.mjs'

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
const NAME_LENGTH_MIN = 2
const GENERATOR_CHECK_MODULE = 'generator-probes'
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
    'Usage: npm run new:module <module> <record>, module in plural and record in singular; lowercase letters, digits, hyphen (businesses business, bank-accounts bank-account)',
  )
}
if (moduleName === GENERATOR_CHECK_MODULE && process.env['GENERATOR_CHECK'] !== '1') {
  fail(
    `«${GENERATOR_CHECK_MODULE}» is reserved: npm run generator:check creates and removes a module with this name. Choose another.`,
  )
}
if (moduleName === entityName) {
  fail(
    `The record name equals the module name «${moduleName}»: a module and its record need different names (equipment equipment-item)`,
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
      `«${forms.kebab}» is a reserved JavaScript word and would become a variable name. Choose another (imports import-batch)`,
    )
  }
}
for (const forms of Object.values(names)) {
  if (forms.camel.length < NAME_LENGTH_MIN) {
    fail(
      `«${forms.kebab}» is one letter: lint requires at least ${String(NAME_LENGTH_MIN)} characters (id-length). Use a word`,
    )
  }
}
if (table.length > TABLE_NAME_MAX) {
  fail(
    `Table name ${table} is longer than ${String(TABLE_NAME_MAX)} characters: the repeat-key constraint name would not fit Postgres's 63`,
  )
}

const templateFiles = (directory) =>
  readdirSync(directory).flatMap((entry) => {
    const full = join(directory, entry)
    return statSync(full).isDirectory() ? templateFiles(full) : [full]
  })

const clashes = namesTakenByTemplates(templateFiles(TEMPLATE_ROOT), {
  moduleName: names.module.camel,
  ModuleName: names.module.pascal,
  entityName: names.entity.camel,
  EntityName: names.entity.pascal,
})
if (clashes.length > 0) {
  const named = clashes.map(({ name, file }) => `${name} (${relative(TEMPLATE_ROOT, file)})`)
  fail(
    `scripts/module-template itself declares or calls this name: ${[...new Set(named)].join(', ')}, so the slice may not compile. Choose another (items → stock-items, result → test-result)`,
  )
}

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
    `Template ${unknown.path} has an unknown placeholder ${UNKNOWN_PLACEHOLDER.exec(`${unknown.path}\n${unknown.content}`)?.[0] ?? ''}: placeholders are listed in PLACEHOLDER in scripts/new-module.mjs`,
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
    `«${moduleName}» is taken: ${taken.join(', ') || `route /${moduleName} in src/app`}. Choose another.`,
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
      `Migration ${table} not created (scripts/db-new.mjs): Supabase CLI must be in PATH. No slice files written.`,
    )
  }
  const created = readdirSync(MIGRATIONS).find((file) => !before.has(file))
  if (!created) fail(`scripts/db-new.mjs did not create migration ${table} in ${MIGRATIONS}`)
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
    { file: QUALITY_SPEC, constant: 'SIGNED_IN_PAGES', value: route, what: `page ${route}` },
    { file: E2E_USERS, constant: 'OWNED_TABLES', value: table, what: `table ${table}` },
  ].map((registry) => ({
    ...registry,
    done: appendToList(registry.file, registry.constant, registry.value),
  })),
  {
    file: SPEED_PAGES,
    constant: 'MEASURED_PAGES',
    value: route,
    what: `page ${route} with seeded rows for the speed check`,
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
      ? `  ~ ${file}: ${what} added to ${constant}`
      : `  ! ${file}: list ${constant} not found; add '${value}' by hand`,
  )
}
const unitTests = `tests/unit/modules/${moduleName}`
const specs = `${E2E_TESTS}/${moduleName}.spec.ts ${E2E_TESTS}/${moduleName}-quality.spec.ts`
console.log(`
Slice ${moduleName} created: ${String(written.length)} files, ${String(lines)} lines, a working sample with title, amount, currency.
npm run gate passes after two steps the generator does not do (they need a running database and a build):
  1. supabase migration up && npm run db:types          — the table in the local database and its types; typecheck is red until then
  2. npm run build && npm run budget -- --update-baseline  — route ${route} in perf-baseline.json
Then adapt it to the entity in three tasks (.claude/rules/docs.md): database and pgTAP → core and unit (${unitTests}) → screen and e2e (${specs}).
npm run perf measures ${route} on 50k rows from its entry in ${SPEED_PAGES}: when table fields change,
update the column expressions (sqlByColumn) and the text the page shows from those rows (textOnScreen).
Change migration fields before supabase migration up; if it is applied already, supabase db reset.
Placeholder UI texts: the «Название раздела» heading in src/app/${moduleName}/page.tsx, form labels and ui/messages.ts.`)
