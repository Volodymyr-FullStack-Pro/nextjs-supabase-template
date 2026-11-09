#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'

import postgres from 'postgres'

const OUTPUT = 'src/shared/infrastructure/supabase/types.ts'
const TABLE_INDENT = '      '

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

const columnsByTable = Map.groupBy(numericColumns, (column) => column.table_name)
let output = formatted
let replaced = 0
for (const [table, columns] of columnsByTable) {
  const start = output.indexOf(`\n${TABLE_INDENT}${table}: {`)
  if (start < 0) continue
  const end = output.indexOf(`\n${TABLE_INDENT}}`, start)
  let block = output.slice(start, end)
  for (const { column_name: column } of columns) {
    const pattern = new RegExp(`^(\\s+${column}\\??: )number$`, 'gmu')
    block = block.replaceAll(pattern, (_match, prefix) => {
      replaced += 1
      return `${prefix}string`
    })
  }
  output = output.slice(0, start) + block + output.slice(end)
}
if (replaced === 0 && numericColumns.length > 0) {
  console.error(
    `numeric-колонки есть (${String(numericColumns.length)}), но в ${OUTPUT} ни одна не заменена: формат вывода изменился`,
  )
  process.exit(1)
}
writeFileSync(OUTPUT, output)
console.log(`${OUTPUT}: numeric → string, заменено полей ${String(replaced)}`)
