#!/usr/bin/env node
import { execFileSync, spawnSync } from 'node:child_process'
import { basename } from 'node:path'

const [command, ...commandArguments] = process.argv.slice(2)
if (!command) {
  console.error('Использование: node scripts/with-local-supabase.mjs <команда> [аргументы]')
  process.exit(1)
}

const PROJECT_ID_VARIABLE = 'SUPABASE_PROJECT_ID'

const explainStatusFailure = (error) => {
  if (error.code === 'ENOENT')
    return 'Supabase CLI не найден в PATH: нужна версия из .github/workflows/db.yml (README, «Новый проект из шаблона»)'
  const folder = basename(process.cwd())
  const projectId = process.env[PROJECT_ID_VARIABLE]
  const project = projectId ?? folder
  const reason =
    String(error.stderr ?? error.message)
      .split('\n')
      .find((line) => line.trim() !== '') ?? 'supabase status завершился с ошибкой'
  const hint = projectId
    ? `  ${PROJECT_ID_VARIABLE}=${projectId} задан: стек с таким именем не запущен — проверьте имя папки, из которой делали supabase start`
    : [
        `  Стек запускали из этой папки («${folder}»): supabase start`,
        `  Эта папка — клон или worktree, а стек запущен из оригинала: имя стека — имя папки оригинала,`,
        `  задайте его перед командой: ${PROJECT_ID_VARIABLE}=<имя папки оригинала> npm run …`,
      ].join('\n')
  return [
    `Локальный Supabase проекта «${project}» не отвечает (контейнер supabase_db_${project}): ${reason}`,
    hint,
  ].join('\n')
}

const readStatus = () => {
  try {
    const output = execFileSync('supabase', ['status', '-o', 'json'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    return JSON.parse(output)
  } catch (error) {
    console.error(explainStatusFailure(error))
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
