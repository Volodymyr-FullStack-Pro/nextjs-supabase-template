import { spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

const SCRIPT = resolve('scripts/totp-code.mjs')
const SECRET = 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP'
const SIX_DIGITS = /^\d{6}$/u

const environmentWithoutSecret = { ...process.env, TEST_USER_TOTP_SECRET: undefined }

describe('npm run totp', () => {
  let directory = ''

  beforeEach(() => {
    directory = mkdtempSync(join(tmpdir(), 'totp-code-'))
  })

  afterEach(() => {
    rmSync(directory, { recursive: true, force: true })
  })

  const runTotp = (environment: NodeJS.ProcessEnv) =>
    spawnSync(process.execPath, [SCRIPT], { cwd: directory, env: environment, encoding: 'utf8' })

  it('prints a code from the secret in .env.test.local', () => {
    writeFileSync(join(directory, '.env.test.local'), `TEST_USER_TOTP_SECRET=${SECRET}\n`)

    const result = runTotp(environmentWithoutSecret)

    expect(result.status).toBe(0)
    expect(result.stdout.trim()).toMatch(SIX_DIGITS)
  })

  it('prints a code from the environment when there is no .env.test.local', () => {
    const result = runTotp({ ...environmentWithoutSecret, TEST_USER_TOTP_SECRET: SECRET })

    expect(result.status).toBe(0)
    expect(result.stdout.trim()).toMatch(SIX_DIGITS)
  })

  it('names both sources when the secret is in neither', () => {
    const result = runTotp(environmentWithoutSecret)

    expect(result.status).toBe(1)
    expect(result.stderr).toContain('.env.test.local')
    expect(result.stderr).toContain('environment')
  })
})
