#!/usr/bin/env node
import { execFileSync, spawnSync } from 'node:child_process'
import { basename } from 'node:path'

const [command, ...commandArguments] = process.argv.slice(2)
if (!command) {
  console.error('Usage: node scripts/with-local-supabase.mjs <command> [arguments]')
  process.exit(1)
}

const PROJECT_ID_VARIABLE = 'SUPABASE_PROJECT_ID'

const explainStatusFailure = (error) => {
  if (error.code === 'ENOENT')
    return 'Supabase CLI is not in PATH: install the version from .github/workflows/db.yml'
  const folder = basename(process.cwd())
  const projectId = process.env[PROJECT_ID_VARIABLE]
  const project = projectId ?? folder
  const reason =
    String(error.stderr ?? error.message)
      .split('\n')
      .find((line) => line.trim() !== '') ?? 'supabase status failed'
  const hint = projectId
    ? `  ${PROJECT_ID_VARIABLE}=${projectId} is set, but no stack with this name is running: check the folder supabase start ran from`
    : [
        `  If the stack belongs to this folder («${folder}»): supabase start`,
        `  If this folder is a clone or worktree and the stack runs from the original, the stack is named after that folder;`,
        `  set it before the command: ${PROJECT_ID_VARIABLE}=<original folder name> npm run …`,
      ].join('\n')
  return [
    `Local Supabase of «${project}» does not respond (container supabase_db_${project}): ${reason}`,
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
