#!/usr/bin/env node
import { execFileSync, spawnSync } from 'node:child_process'

const MIGRATIONS_DIR = 'supabase/migrations'
const baseRef = process.argv[2] ?? 'origin/main'

const gitLines = (args) =>
  execFileSync('git', args, { encoding: 'utf8' })
    .split('\n')
    .filter((line) => line.endsWith('.sql'))

const committed = gitLines([
  'diff',
  '--name-only',
  '--diff-filter=A',
  baseRef,
  '--',
  MIGRATIONS_DIR,
])
const untracked = gitLines(['ls-files', '--others', '--exclude-standard', '--', MIGRATIONS_DIR])
const newMigrations = [...new Set([...committed, ...untracked])].toSorted()

if (newMigrations.length === 0) {
  console.log(`Новых миграций относительно ${baseRef} нет`)
  process.exit(0)
}
console.log(`Squawk: ${newMigrations.join(', ')}`)
const result = spawnSync('squawk', newMigrations, { stdio: 'inherit' })
process.exit(result.status ?? 1)
