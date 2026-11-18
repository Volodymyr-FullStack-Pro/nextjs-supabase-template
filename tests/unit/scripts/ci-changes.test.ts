import { describe, expect, it } from 'vitest'

import { isDocumentsOnly } from '../../../scripts/ci-changes-check.mjs'

describe('isDocumentsOnly', () => {
  it('treats docs, Claude rules and markdown outside code folders as documents', () => {
    expect(
      isDocumentsOnly([
        'docs/knowledge/decisions.md',
        'docs/ops/github/branch-protection.json',
        '.claude/rules/docs.md',
        '.claude/settings.json',
        'CLAUDE.md',
        'README.md',
        '.github/pull_request_template.md',
        'supabase/README.md',
      ]),
    ).toBe(true)
  })

  it('runs everything when any changed file can affect the app or the checks', () => {
    expect(isDocumentsOnly(['docs/roadmap.md', 'src/app/page.tsx'])).toBe(false)
    expect(isDocumentsOnly(['.github/workflows/ci.yml'])).toBe(false)
    expect(isDocumentsOnly(['package.json'])).toBe(false)
    expect(isDocumentsOnly(['supabase/migrations/20261118000000_x.sql'])).toBe(false)
  })

  it('treats markdown outside the listed places as code', () => {
    expect(isDocumentsOnly(['src/modules/notes/README.md'])).toBe(false)
    expect(isDocumentsOnly(['scripts/module-template/README.md'])).toBe(false)
    expect(isDocumentsOnly(['tests/e2e/README.md'])).toBe(false)
    expect(isDocumentsOnly(['public/terms.md'])).toBe(false)
    expect(isDocumentsOnly(['.github/ISSUE_TEMPLATE/bug.md'])).toBe(false)
  })

  it('keeps non-ASCII names in document folders as documents', () => {
    expect(isDocumentsOnly(['docs/client/source/Ответы.pdf'])).toBe(true)
  })

  it('matches folders by the whole name, not by a prefix of it', () => {
    expect(isDocumentsOnly(['docs'])).toBe(false)
    expect(isDocumentsOnly(['docsite/index.ts'])).toBe(false)
    expect(isDocumentsOnly(['.claudeignore'])).toBe(false)
  })

  it('runs everything when the list of changed files is empty or unknown', () => {
    expect(isDocumentsOnly([])).toBe(false)
    expect(isDocumentsOnly([''])).toBe(false)
  })
})
