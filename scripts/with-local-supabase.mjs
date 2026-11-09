#!/usr/bin/env node
import { execFileSync, spawnSync } from 'node:child_process'

const [command, ...commandArguments] = process.argv.slice(2)
if (!command) {
  console.error('Использование: node scripts/with-local-supabase.mjs <команда> [аргументы]')
  process.exit(1)
}

const readStatus = () => {
  try {
    const output = execFileSync('supabase', ['status', '-o', 'json'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    })
    return JSON.parse(output)
  } catch {
    console.error('Локальный Supabase не запущен: supabase start')
    return process.exit(1)
  }
}

const status = readStatus()
const result = spawnSync(command, commandArguments, {
  stdio: 'inherit',
  env: {
    ...process.env,
    NEXT_PUBLIC_SUPABASE_URL: status.API_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: status.PUBLISHABLE_KEY,
    SUPABASE_SECRET_KEY: status.SECRET_KEY,
    DATABASE_URL: status.DB_URL,
  },
})
process.exit(result.status ?? 1)
