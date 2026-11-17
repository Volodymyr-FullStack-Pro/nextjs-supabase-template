import { describe, expect, it } from 'vitest'

import { auditProblems, MAX_EXCEPTION_DAYS } from '../../../scripts/audit-check.mjs'

const PICOMATCH = {
  source: 1,
  name: 'picomatch',
  title: 'picomatch vulnerable to ReDoS',
  url: 'https://github.com/advisories/GHSA-fc5q-39xc-vjpf',
  severity: 'high',
}

const reportWith = (...advisories: object[]) => ({
  vulnerabilities: {
    picomatch: { name: 'picomatch', severity: 'high', via: advisories },
    fdir: { name: 'fdir', severity: 'high', via: ['picomatch'] },
  },
})

const EXCEPTION = {
  id: 'GHSA-fc5q-39xc-vjpf',
  packages: ['picomatch'],
  reason: 'build tooling only, no fixed version yet',
  reviewBy: '2026-12-01',
}

describe('auditProblems', () => {
  it('passes a clean report with no exceptions', () => {
    expect(auditProblems({ vulnerabilities: {} }, [], '2026-11-17')).toEqual([])
  })

  it('fails on a high advisory that has no exception', () => {
    expect(auditProblems(reportWith(PICOMATCH), [], '2026-11-17')).toEqual([
      'high GHSA-fc5q-39xc-vjpf in picomatch: picomatch vulnerable to ReDoS',
    ])
  })

  it('fails on a critical advisory as well', () => {
    const critical = { ...PICOMATCH, severity: 'critical' }
    expect(auditProblems(reportWith(critical), [], '2026-11-17')).toHaveLength(1)
  })

  it('ignores advisories below high', () => {
    const moderate = { ...PICOMATCH, severity: 'moderate' }
    expect(auditProblems(reportWith(moderate), [], '2026-11-17')).toEqual([])
  })

  it('reports one advisory once, however many packages pull it in', () => {
    const report = {
      vulnerabilities: {
        picomatch: { name: 'picomatch', severity: 'high', via: [PICOMATCH] },
        tinyglobby: { name: 'tinyglobby', severity: 'high', via: [PICOMATCH, 'fdir'] },
      },
    }
    expect(auditProblems(report, [], '2026-11-17')).toHaveLength(1)
  })

  it('lets an advisory through while its exception is in force, the review day included', () => {
    expect(auditProblems(reportWith(PICOMATCH), [EXCEPTION], '2026-11-17')).toEqual([])
    expect(auditProblems(reportWith(PICOMATCH), [EXCEPTION], '2026-12-01')).toEqual([])
  })

  it('fails again the day after the review date', () => {
    expect(auditProblems(reportWith(PICOMATCH), [EXCEPTION], '2026-12-02')).toEqual([
      'exception GHSA-fc5q-39xc-vjpf expired on 2026-12-01: update the package or review the exception',
      'high GHSA-fc5q-39xc-vjpf in picomatch: picomatch vulnerable to ReDoS',
    ])
  })

  it('asks to remove an exception the report no longer needs', () => {
    expect(auditProblems({ vulnerabilities: {} }, [EXCEPTION], '2026-11-17')).toEqual([
      'exception GHSA-fc5q-39xc-vjpf is no longer reported: remove it from scripts/audit-exceptions.mjs',
    ])
  })

  it('does not excuse a different advisory in the same package', () => {
    const other = { ...PICOMATCH, url: 'https://github.com/advisories/GHSA-aaaa-bbbb-cccc' }
    expect(auditProblems(reportWith(PICOMATCH, other), [EXCEPTION], '2026-11-17')).toEqual([
      'high GHSA-aaaa-bbbb-cccc in picomatch: picomatch vulnerable to ReDoS',
    ])
  })

  it('does not excuse the same advisory in a package the exception does not name', () => {
    const elsewhere = { ...PICOMATCH, name: 'micromatch' }
    expect(auditProblems(reportWith(PICOMATCH, elsewhere), [EXCEPTION], '2026-11-17')).toEqual([
      'high GHSA-fc5q-39xc-vjpf in micromatch: picomatch vulnerable to ReDoS',
    ])
  })

  it.each([
    ['no review date', { ...EXCEPTION, reviewBy: undefined }],
    ['a review date that is not an ISO day', { ...EXCEPTION, reviewBy: '2026-12-1' }],
    ['a Date instead of a string', { ...EXCEPTION, reviewBy: new Date('2026-12-01') }],
    ['an empty reason', { ...EXCEPTION, reason: ' ' }],
    ['no packages', { ...EXCEPTION, packages: [] }],
    ['an id that is not an advisory id', { ...EXCEPTION, id: 'picomatch' }],
  ])('rejects an exception with %s and stops excusing the advisory', (_case, exception) => {
    const problems = auditProblems(reportWith(PICOMATCH), [exception], '2026-11-17')
    expect(problems).toHaveLength(2)
    expect(problems[0]).toContain('fix scripts/audit-exceptions.mjs')
    expect(problems[1]).toBe('high GHSA-fc5q-39xc-vjpf in picomatch: picomatch vulnerable to ReDoS')
  })

  it('rejects an exception reviewed further ahead than the limit', () => {
    const farAhead = { ...EXCEPTION, reviewBy: '2027-06-01' }
    const [first] = auditProblems(reportWith(PICOMATCH), [farAhead], '2026-11-17')
    expect(first).toContain(`more than ${String(MAX_EXCEPTION_DAYS)} days`)
  })

  it.each([
    ['null', null],
    ['an npm error object', { error: { code: 'ENOTFOUND' } }],
    ['a list instead of the vulnerabilities map', { vulnerabilities: [] }],
  ])('fails when npm audit returned %s', (_case, report) => {
    expect(auditProblems(report, [], '2026-11-17')).toEqual(['npm audit returned no report'])
  })

  it('fails on a severity npm does not use', () => {
    const odd = { ...PICOMATCH, severity: 'HIGH' }
    expect(auditProblems(reportWith(odd), [], '2026-11-17')).toEqual([
      'GHSA-fc5q-39xc-vjpf in picomatch has an unknown severity: HIGH',
    ])
  })

  it('fails on a high advisory without a link instead of crashing', () => {
    const unlinked = { ...PICOMATCH, url: undefined }
    expect(auditProblems(reportWith(unlinked), [EXCEPTION], '2026-11-17')).toEqual([
      'exception GHSA-fc5q-39xc-vjpf is no longer reported: remove it from scripts/audit-exceptions.mjs',
      'high unknown-advisory in picomatch: picomatch vulnerable to ReDoS',
    ])
  })

  it('fails when the totals count a high advisory that the list does not show', () => {
    const report = { vulnerabilities: {}, metadata: { vulnerabilities: { high: 1, critical: 0 } } }
    expect(auditProblems(report, [], '2026-11-17')).toEqual([
      'npm audit counts high or critical advisories but lists none',
    ])
  })
})
