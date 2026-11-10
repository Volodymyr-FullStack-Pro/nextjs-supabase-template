#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'

import postgres from 'postgres'

const OUTPUT = 'src/shared/infrastructure/supabase/types.ts'
const TABLE_INDENT = '      '
const SECTION_INDENT = `${TABLE_INDENT}  `
const WRITE_SECTIONS = ['Insert', 'Update']

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
const numericColumns = await sql`
  select table_name, column_name
  from information_schema.columns
  where table_schema = 'public' and data_type = 'numeric'
`
await sql.end()

const columnLine = (column, type) =>
  new RegExp(`^(\\s+${RegExp.escape(column)}\\??: )${type}$`, 'mu')

function sectionRange(block, name) {
  const start = block.indexOf(`\n${SECTION_INDENT}${name}: {`)
  if (start < 0) return null
  return { start, end: block.indexOf(`\n${SECTION_INDENT}}`, start) }
}

function numericToString(section, column) {
  const rewritten = section.replace(columnLine(column, 'number( \\| null)?'), '$1string$2')
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
    if (!columnLine(column, 'number( \\| null)?').test(rowSection))
      unmatched.push(`${column} (Row)`)
  }
  let rewritten = block
  for (const name of WRITE_SECTIONS) {
    rewritten = rewriteSection(rewritten, name, columns, unmatched)
  }
  return { block: rewritten, unmatched }
}

const columnsByTable = Map.groupBy(numericColumns, (column) => column.table_name)
let output = formatted
const failures = []
for (const [table, columns] of columnsByTable) {
  const start = output.indexOf(`\n${TABLE_INDENT}${table}: {`)
  if (start < 0) continue
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
    `numeric-колонки не найдены в ${OUTPUT} (формат вывода изменился?): ${failures.join(', ')}`,
  )
  process.exit(1)
}
writeFileSync(OUTPUT, output)
console.log(
  `${OUTPUT}: numeric в Row — number (так отдаёт PostgREST без ::text), в Insert и Update — string; колонок ${String(numericColumns.length)}`,
)
