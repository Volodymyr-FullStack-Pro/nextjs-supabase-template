import { execFileSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdtempSync, rmSync, statSync, utimesSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const GATE_SETS = new Set(['full', 'reduced'])

export function parseGateStampArgs(argv) {
  const [command, set, ...rest] = argv
  if (rest.length > 0) return undefined
  if (command === 'start' && set === undefined) return { command }
  if (command === 'done' && GATE_SETS.has(set)) return { command, set }
  return undefined
}

export function gateStampResult({ startTree, endTree, set, head, at }) {
  if (startTree === undefined) {
    return { error: 'no start of the run: call gate-stamp start before gate-stamp done' }
  }
  if (startTree !== endTree) {
    return {
      skipped: 'working tree changed during the run, stamp not written: run the gate again',
    }
  }
  return { stamp: { tree: endTree, set, head, at } }
}

export function workingTreeId(cwd) {
  const git = (args, environment = {}) =>
    execFileSync('git', args, {
      cwd,
      encoding: 'utf8',
      env: { ...process.env, ...environment },
    }).trim()
  const realIndex = resolve(cwd, git(['rev-parse', '--git-path', 'index']))
  const directory = mkdtempSync(join(tmpdir(), 'gate-stamp-'))
  const index = join(directory, 'index')
  try {
    if (existsSync(realIndex)) {
      copyFileSync(realIndex, index)
      const { atime, mtime } = statSync(realIndex)
      utimesSync(index, atime, mtime)
    }
    git(['add', '--all'], { GIT_INDEX_FILE: index })
    return git(['write-tree'], { GIT_INDEX_FILE: index })
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
}
