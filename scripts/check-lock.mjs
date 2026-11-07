#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import { cpSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const CI_NPM = 'npm@10'
const lockFile = process.argv[2] ?? 'package-lock.json'
const workDir = mkdtempSync(join(tmpdir(), 'lock-check-'))
try {
  cpSync('package.json', join(workDir, 'package.json'))
  cpSync(lockFile, join(workDir, 'package-lock.json'))
  execFileSync(
    'npx',
    ['-y', CI_NPM, 'ci', '--dry-run', '--ignore-scripts', '--no-audit', '--no-fund'],
    {
      cwd: workDir,
      stdio: 'pipe',
    },
  )
  console.log(`package-lock.json принимается ${CI_NPM} (как в CI и на Vercel)`)
} catch (error) {
  const output = String(error.stderr ?? error.message)
  console.error(
    output
      .split('\n')
      .filter((line) => line.includes('npm error'))
      .slice(0, 3)
      .join('\n'),
  )
  console.error(
    `\nLock-файл рассинхронизирован для ${CI_NPM}. Пересоберите его: npx ${CI_NPM} install --package-lock-only`,
  )
  process.exit(1)
} finally {
  rmSync(workDir, { recursive: true, force: true })
}
