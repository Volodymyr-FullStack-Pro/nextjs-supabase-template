import { execFileSync } from 'node:child_process'
import { appendFileSync } from 'node:fs'

import { isDocumentsOnly } from './ci-changes-check.mjs'

const LOGGED_PATHS = 20

const [base = ''] = process.argv.slice(2)

function changedPaths() {
  try {
    return execFileSync('git', ['diff', '-z', '--name-only', '--no-renames', base, 'HEAD'], {
      encoding: 'utf8',
    })
      .split('\0')
      .filter((path) => path !== '')
  } catch {
    return []
  }
}

const paths = changedPaths()
const documentsOnly = isDocumentsOnly(paths)
console.info(
  JSON.stringify({
    base,
    changedFiles: paths.length,
    documentsOnly,
    sample: paths.slice(0, LOGGED_PATHS),
  }),
)
if (process.env.GITHUB_OUTPUT !== undefined) {
  appendFileSync(process.env.GITHUB_OUTPUT, `documents_only=${String(documentsOnly)}\n`)
}
