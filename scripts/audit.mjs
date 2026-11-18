import { execFileSync } from 'node:child_process'

import { auditProblems } from './audit-check.mjs'
import { AUDIT_EXCEPTIONS } from './audit-exceptions.mjs'

const ISO_DATE_LENGTH = 10
const MAX_REPORT_BYTES = 16_777_216

const envWithoutNpmConfig = Object.fromEntries(
  Object.entries(process.env).filter(([key]) => !key.toLowerCase().startsWith('npm_config_')),
)

function productionAuditOutput() {
  try {
    return execFileSync('npm', ['audit', '--omit=dev', '--json'], {
      encoding: 'utf8',
      env: envWithoutNpmConfig,
      maxBuffer: MAX_REPORT_BYTES,
      stdio: ['ignore', 'pipe', 'inherit'],
    })
  } catch (error) {
    if (typeof error.stdout === 'string' && error.stdout !== '') return error.stdout
    throw error
  }
}

const report = JSON.parse(productionAuditOutput())
const today = new Date().toISOString().slice(0, ISO_DATE_LENGTH)
const problems = auditProblems(report, AUDIT_EXCEPTIONS, today)
for (const { id, reason, reviewBy } of AUDIT_EXCEPTIONS) {
  console.info(`Audit exception ${id}, review by ${reviewBy}: ${reason}`)
}
if (problems.length > 0) {
  console.error(`Production audit failed:\n${problems.map((problem) => `  ${problem}`).join('\n')}`)
  process.exit(1)
}
console.info('Production audit: no high or critical advisories outside the exceptions')
