#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs'

import {
  GATE_EXCLUDED_PATHS,
  gateStampResult,
  parseGateStampArgs,
  workingTreeId,
} from './gate-fingerprint.mjs'

const USAGE_EXIT_CODE = 2
const TREE_PREVIEW_LENGTH = 12

const options = parseGateStampArgs(process.argv.slice(2))
if (options === undefined) {
  console.error('usage: node scripts/gate-stamp.mjs start | done <full|reduced>')
  process.exit(USAGE_EXIT_CODE)
}

const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim()
const startFile = git('rev-parse', '--git-path', 'devkit-gate-start')
const stampFile = git('rev-parse', '--git-path', 'devkit-gate')
const tree = workingTreeId(process.cwd(), GATE_EXCLUDED_PATHS)

if (options.command === 'start') {
  writeFileSync(startFile, `${tree}\n`)
  process.exit(0)
}

const startTree = existsSync(startFile) ? readFileSync(startFile, 'utf8').trim() : undefined
rmSync(startFile, { force: true })
const result = gateStampResult({
  startTree,
  endTree: tree,
  excluded: GATE_EXCLUDED_PATHS,
  set: options.set,
  head: git('rev-parse', 'HEAD'),
  at: new Date().toISOString(),
})

if (result.error !== undefined) {
  console.error(`gate-stamp: ${result.error}`)
  process.exit(1)
}
if (result.skipped !== undefined) {
  console.error(`gate-stamp: ${result.skipped}`)
  process.exit(0)
}
writeFileSync(stampFile, `${JSON.stringify(result.stamp)}\n`)
console.info(
  `gate-stamp: ${result.stamp.set} gate passed on tree ${result.stamp.tree.slice(0, TREE_PREVIEW_LENGTH)}`,
)
