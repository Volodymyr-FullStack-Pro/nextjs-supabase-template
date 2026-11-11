#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import { relative } from 'node:path'

const HEADER = "set lock_timeout = '5s';\nset statement_timeout = '60s';\n\n"
const NAME_PATTERN = /^[a-z][a-z0-9_]*$/u

const name = process.argv[2]
if (!name || !NAME_PATTERN.test(name)) {
  console.error(
    'Использование: npm run db:new <имя> — имя миграции латиницей в нижнем регистре, цифры и подчёркивания (accounts, notes_currency)',
  )
  process.exit(1)
}

const result = spawnSync('supabase', ['migration', 'new', name, '--output-format', 'json'], {
  encoding: 'utf8',
  input: HEADER,
  stdio: ['pipe', 'pipe', 'inherit'],
})
if (result.status !== 0) {
  console.error(result.stdout)
  process.exit(result.status ?? 1)
}

const { path } = JSON.parse(result.stdout)
console.log(`Создана миграция ${relative(process.cwd(), path)} с lock_timeout и statement_timeout`)
console.log('Дальше: SQL в файл → supabase migration up → npm run db:types → supabase test db')
