#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'

import postgres from 'postgres'

const OUTPUT = 'src/shared/infrastructure/supabase/types.ts'
const CONVENTIONS_TEST = 'supabase/tests/900-table-conventions.sql'
const TABLE_INDENT = '      '
const SECTION_INDENT = `${TABLE_INDENT}  `
const WRITE_SECTIONS = ['Insert', 'Update']
const NUMBER_TYPE = String.raw`number((?:\[\])*)( \| null)?`

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  console.error('Запуск: npm run db:types при запущенном supabase start')
  process.exit(1)
}

const generated = execFileSync('supabase', ['gen', 'types', 'typescript', '--schema', 'public'], {
  encoding: 'utf8',
})
const formatted = execFileSync('npx', ['prettier', '--stdin-filepath', OUTPUT], {
  encoding: 'utf8',
  input: generated,
})
const sql = postgres(databaseUrl, { max: 1 })
const numericTypes = sql`
  with recursive resolved as (
    select t.oid as root, t.oid, t.typbasetype, t.typelem, t.typcategory
    from pg_type t
    union all
    select r.root, t.oid, t.typbasetype, t.typelem, t.typcategory
    from resolved r
    join pg_type t
      on t.oid = case when r.typbasetype <> 0 then r.typbasetype when r.typcategory = 'A' then r.typelem end
  )
  select distinct root from resolved where oid = 'numeric'::regtype
`
const numericColumns = await sql`
  select c.relname as table_name, a.attname as column_name
  from pg_attribute a
  join pg_class c on c.oid = a.attrelid
  where c.relnamespace = 'public'::regnamespace
    and c.relkind in ('r', 'p', 'v', 'm', 'f')
    and a.attnum > 0
    and not a.attisdropped
    and a.atttypid in (${numericTypes})
`
const numericFunctions = await sql`
  select p.proname as name, p.oid::regprocedure::text as signature
  from pg_proc p
  where p.pronamespace = 'public'::regnamespace
    and exists (
      select 1
      from unnest(p.prorettype || p.proargtypes::oid[] || coalesce(p.proallargtypes, '{}')) as used (type_oid)
      where used.type_oid in (${numericTypes})
    )
`
await sql.end()

const quoted = (name) => `['"]?${RegExp.escape(name)}['"]?`
const columnLine = (column, type) => new RegExp(`^(\\s+${quoted(column)}\\??: )${type}$`, 'mu')

function tableStart(output, table) {
  const found = new RegExp(`\\n${TABLE_INDENT}${quoted(table)}: \\{`, 'u').exec(output)
  return found ? found.index : -1
}

function sectionRange(block, name) {
  const start = block.indexOf(`\n${SECTION_INDENT}${name}: {`)
  if (start < 0) return null
  return { start, end: block.indexOf(`\n${SECTION_INDENT}}`, start) }
}

function numericToString(section, column) {
  const rewritten = section.replace(columnLine(column, NUMBER_TYPE), '$1string$2$3')
  if (rewritten !== section) return rewritten
  return columnLine(column, 'never').test(section) ? section : null
}

function rewriteSection(block, name, columns, unmatched) {
  const range = sectionRange(block, name)
  if (!range) return block
  let section = block.slice(range.start, range.end)
  for (const column of columns) {
    const rewritten = numericToString(section, column)
    if (rewritten === null) unmatched.push(`${column} (${name})`)
    else section = rewritten
  }
  return block.slice(0, range.start) + section + block.slice(range.end)
}

function rewriteTable(block, columns) {
  const unmatched = []
  const row = sectionRange(block, 'Row')
  const rowSection = row ? block.slice(row.start, row.end) : ''
  for (const column of columns) {
    if (!columnLine(column, NUMBER_TYPE).test(rowSection)) unmatched.push(`${column} (Row)`)
  }
  let rewritten = block
  for (const name of WRITE_SECTIONS) {
    rewritten = rewriteSection(rewritten, name, columns, unmatched)
  }
  return { block: rewritten, unmatched }
}

const exceptedFunctions = new Set(
  readFileSync(CONVENTIONS_TEST, 'utf8')
    .matchAll(/^\s*\(\s*'(?<name>[^']+)'\s*,\s*'rpc_numeric'/gmu)
    .map((match) => match.groups.name),
)
const forbiddenFunctions = numericFunctions.filter(({ name }) => !exceptedFunctions.has(name))
if (forbiddenFunctions.length > 0) {
  console.error(
    [
      'Функции public с numeric в аргументах или результате (в том числе под доменом и в массиве):',
      ...forbiddenFunctions.map(({ signature }) => `  ${signature}`),
      'В types.ts такой аргумент и результат — number: деньги через rpc передаются и возвращаются text.',
      `Осознанное исключение — строка с ключом rpc_numeric и D-NNN в ${CONVENTIONS_TEST}.`,
    ].join('\n'),
  )
  process.exit(1)
}

const columnsByTable = Map.groupBy(numericColumns, (column) => column.table_name)
let output = formatted
const failures = []
for (const [table, columns] of columnsByTable) {
  const start = tableStart(output, table)
  if (start < 0) {
    failures.push(`${table} (таблица или представление не найдены)`)
    continue
  }
  const end = output.indexOf(`\n${TABLE_INDENT}}`, start)
  const { block, unmatched } = rewriteTable(
    output.slice(start, end),
    columns.map((column) => column.column_name),
  )
  failures.push(...unmatched.map((place) => `${table}.${place}`))
  output = output.slice(0, start) + block + output.slice(end)
}
if (failures.length > 0) {
  console.error(
    `numeric-колонки не переписаны в ${OUTPUT}: ${failures.join(', ')} — в выводе supabase gen types тип колонки не number (массив доменов он описывает как unknown[]: объявите колонку numeric[]) или формат вывода изменился`,
  )
  process.exit(1)
}
writeFileSync(OUTPUT, output)
const kept = numericFunctions.map(({ signature }) => signature)
console.log(
  `${OUTPUT}: numeric в Row — number (так отдаёт PostgREST без ::text), в Insert и Update — string; колонок ${String(numericColumns.length)}` +
    (kept.length > 0
      ? `; функции с numeric по исключению rpc_numeric остаются number: ${kept.join(', ')}`
      : ''),
)
