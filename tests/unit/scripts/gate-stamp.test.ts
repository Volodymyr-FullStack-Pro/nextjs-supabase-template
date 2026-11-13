import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  GATE_EXCLUDED_PATHS,
  gateStampResult,
  parseGateStampArgs,
  workingTreeId,
} from '../../../scripts/gate-fingerprint.mjs'

const HANDOFF = '.claude/handoff.md'

describe('parseGateStampArgs', () => {
  it('reads the start of a run', () => {
    expect(parseGateStampArgs(['start'])).toEqual({ command: 'start' })
  })

  it('reads the end of a full or a reduced run', () => {
    expect(parseGateStampArgs(['done', 'full'])).toEqual({ command: 'done', set: 'full' })
    expect(parseGateStampArgs(['done', 'reduced'])).toEqual({ command: 'done', set: 'reduced' })
  })

  it.each([[[]], [['done']], [['done', 'partial']], [['start', 'full']], [['finish', 'full']]])(
    'rejects %j',
    (argv) => {
      expect(parseGateStampArgs(argv)).toBeUndefined()
    },
  )
})

describe('gateStampResult', () => {
  const run = {
    excluded: ['.claude/handoff.md'],
    set: 'full',
    head: 'abc123',
    at: '2026-11-12T18:00:00.000Z',
  }

  it('stamps the tree and the paths left out of it when the tree did not change during the run', () => {
    expect(gateStampResult({ ...run, startTree: 'tree1', endTree: 'tree1' })).toEqual({
      stamp: {
        tree: 'tree1',
        excluded: ['.claude/handoff.md'],
        set: 'full',
        head: 'abc123',
        at: '2026-11-12T18:00:00.000Z',
      },
    })
  })

  it('records the paths it was given, not a fixed list', () => {
    expect(
      gateStampResult({ ...run, excluded: [], startTree: 'tree1', endTree: 'tree1' }).stamp,
    ).toMatchObject({ excluded: [] })
  })

  it('does not stamp a tree that changed during the run', () => {
    expect(gateStampResult({ ...run, startTree: 'tree1', endTree: 'tree2' })).toEqual({
      skipped: 'working tree changed during the run, stamp not written: run the gate again',
    })
  })

  it('fails when the run did not record its start', () => {
    expect(gateStampResult({ ...run, startTree: undefined, endTree: 'tree1' })).toEqual({
      error: 'no start of the run: call gate-stamp start before gate-stamp done',
    })
  })
})

describe('workingTreeId', () => {
  let repository = ''
  const git = (...args: string[]) =>
    execFileSync(
      'git',
      [
        '-c',
        'user.name=gate',
        '-c',
        'user.email=gate@example.com',
        '-c',
        'commit.gpgsign=false',
        '-c',
        'core.hooksPath=/dev/null',
        ...args,
      ],
      { cwd: repository, encoding: 'utf8' },
    ).trim()
  const write = (name: string, text: string) => {
    writeFileSync(join(repository, name), text)
  }

  beforeEach(() => {
    repository = mkdtempSync(join(tmpdir(), 'gate-stamp-test-'))
    git('init', '--quiet')
    write('.gitignore', 'ignored.log\n')
    write('tracked.txt', 'one\n')
    git('add', '--all')
    git('commit', '--quiet', '--message', 'initial')
  })

  afterEach(() => {
    rmSync(repository, { recursive: true, force: true })
  })

  it('equals the committed tree when nothing changed', () => {
    expect(workingTreeId(repository)).toBe(git('rev-parse', 'HEAD^{tree}'))
  })

  it('sees an unstaged edit and leaves the real index alone', () => {
    const clean = workingTreeId(repository)
    write('tracked.txt', 'two\n')
    expect(workingTreeId(repository)).not.toBe(clean)
    expect(git('diff', '--cached', '--name-only')).toBe('')
  })

  it('sees a new file', () => {
    const clean = workingTreeId(repository)
    write('new.txt', 'new\n')
    expect(workingTreeId(repository)).not.toBe(clean)
    expect(git('status', '--porcelain')).toBe('?? new.txt')
  })

  it('sees a same-size edit within the second of the last index write', () => {
    const fileTime = new Date('2020-01-01T00:00:00Z')
    git('config', 'core.trustctime', 'false')
    utimesSync(join(repository, 'tracked.txt'), fileTime, fileTime)
    git('add', 'tracked.txt')
    utimesSync(join(repository, git('rev-parse', '--git-path', 'index')), fileTime, fileTime)
    const clean = workingTreeId(repository)
    write('tracked.txt', 'two\n')
    utimesSync(join(repository, 'tracked.txt'), fileTime, fileTime)
    expect(workingTreeId(repository)).not.toBe(clean)
  })

  it('ignores a file listed in .gitignore', () => {
    const clean = workingTreeId(repository)
    write('ignored.log', 'noise\n')
    expect(workingTreeId(repository)).toBe(clean)
  })

  describe('with the handoff note left out', () => {
    beforeEach(() => {
      mkdirSync(join(repository, '.claude'))
      write(HANDOFF, '# Handoff 1\n')
      git('add', '--all')
      git('commit', '--quiet', '--message', 'handoff')
    })

    it('does not change when only the handoff note changes, and leaves the real index alone', () => {
      const clean = workingTreeId(repository, GATE_EXCLUDED_PATHS)
      write(HANDOFF, '# Handoff 2\n')
      expect(workingTreeId(repository, GATE_EXCLUDED_PATHS)).toBe(clean)
      git('add', HANDOFF)
      git('commit', '--quiet', '--message', 'handoff 2')
      expect(workingTreeId(repository, GATE_EXCLUDED_PATHS)).toBe(clean)
      expect(git('status', '--porcelain')).toBe('')
    })

    it('still sees an edit of any other file', () => {
      const clean = workingTreeId(repository, GATE_EXCLUDED_PATHS)
      write('tracked.txt', 'two\n')
      expect(workingTreeId(repository, GATE_EXCLUDED_PATHS)).not.toBe(clean)
    })

    it('takes the paths literally, not as patterns', () => {
      expect(workingTreeId(repository, ['*.txt', '.claude'])).toBe(workingTreeId(repository))
    })
  })
})
