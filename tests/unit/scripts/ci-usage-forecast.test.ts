import { describe, expect, it } from 'vitest'

import {
  acceptedTaskIds,
  DEFAULT_INCLUDED_MINUTES,
  includedMinutesFrom,
  jobMinutes,
  tasksAffordable,
  usageForecast,
  warningMinutes,
} from '../../../scripts/ci-usage-forecast.mjs'

const TEAM = 3000
const FREE = 2000

describe('jobMinutes', () => {
  it('rounds every started minute up, as GitHub bills each job', () => {
    expect(
      jobMinutes({ started_at: '2026-11-12T10:00:00Z', completed_at: '2026-11-12T10:02:01Z' }),
    ).toBe(3)
  })

  it('bills a job that ran a few seconds as one minute', () => {
    expect(
      jobMinutes({ started_at: '2026-11-12T10:00:00Z', completed_at: '2026-11-12T10:00:07Z' }),
    ).toBe(1)
  })

  it('does not bill a job that never started or is still running', () => {
    expect(jobMinutes({ started_at: null, completed_at: null })).toBe(0)
    expect(jobMinutes({ started_at: '2026-11-12T10:00:00Z', completed_at: null })).toBe(0)
  })
})

describe('includedMinutesFrom', () => {
  it('defaults to the minutes of a GitHub Team plan', () => {
    expect(includedMinutesFrom(undefined)).toBe(DEFAULT_INCLUDED_MINUTES)
    expect(includedMinutesFrom('')).toBe(DEFAULT_INCLUDED_MINUTES)
    expect(DEFAULT_INCLUDED_MINUTES).toBe(TEAM)
  })

  it('reads a whole positive number of minutes', () => {
    expect(includedMinutesFrom('2000')).toBe(FREE)
    expect(includedMinutesFrom(' 50000 ')).toBe(50_000)
  })

  it.each(['abc', '0', '-5', '1.5', '2000 minutes'])('rejects %j', (value) => {
    expect(includedMinutesFrom(value)).toBeUndefined()
  })
})

describe('warningMinutes', () => {
  it('warns at two thirds of the included minutes', () => {
    expect(warningMinutes(TEAM)).toBe(2000)
    expect(warningMinutes(FREE)).toBe(1333)
  })
})

describe('usageForecast', () => {
  it('adds the last week pace for the time left in the month, today included', () => {
    const forecast = usageForecast({
      usedMinutes: 92,
      lastWeekMinutes: 140,
      now: new Date('2026-11-12T10:00:00Z'),
      includedMinutes: TEAM,
    })
    expect(forecast.daysLeft).toBe(19)
    expect(forecast.projectedMinutes).toBe(92 + 372)
    expect(forecast.status).toBe('ok')
  })

  it('warns before the included minutes run out', () => {
    expect(
      usageForecast({
        usedMinutes: 1500,
        lastWeekMinutes: 700,
        now: new Date('2026-11-23T10:00:00Z'),
        includedMinutes: TEAM,
      }).status,
    ).toBe('warning')
  })

  it('measures the warning against the included minutes of the plan', () => {
    const pace = { lastWeekMinutes: 0, now: new Date('2026-11-23T10:00:00Z') }
    expect(usageForecast({ ...pace, usedMinutes: 1400, includedMinutes: TEAM }).status).toBe('ok')
    expect(usageForecast({ ...pace, usedMinutes: 1400, includedMinutes: FREE }).status).toBe(
      'warning',
    )
  })

  it('reports a forecast above the included minutes', () => {
    const forecast = usageForecast({
      usedMinutes: 2900,
      lastWeekMinutes: 700,
      now: new Date('2026-11-23T10:00:00Z'),
      includedMinutes: TEAM,
    })
    expect(forecast.projectedMinutes).toBeGreaterThan(TEAM)
    expect(forecast.status).toBe('over')
  })

  it('counts only the hours left on the last day of the month', () => {
    const forecast = usageForecast({
      usedMinutes: 900,
      lastWeekMinutes: 300,
      now: new Date('2026-11-30T23:00:00Z'),
      includedMinutes: TEAM,
    })
    expect(forecast.daysLeft).toBe(1)
    expect(forecast.projectedMinutes).toBe(902)
  })
})

describe('acceptedTaskIds', () => {
  it('finds task commits and task lines inside a squash commit, each task once', () => {
    const messages = [
      'B00-T02: project documents',
      'B00 Project setup (#2)\n\n* B00-T02: project documents\n* wip: B00-T01 fix\n* B00-T01: repository and CI',
      'wip: B00-T03 generator slice',
      'docs: D-005 subtask statuses',
    ].join('\n')
    expect(acceptedTaskIds(messages)).toEqual(new Set(['B00-T01', 'B00-T02']))
  })
})

describe('tasksAffordable', () => {
  it('divides the minutes left by the minutes one accepted task costs', () => {
    expect(tasksAffordable({ usedMinutes: 900, minutesPerTask: 30, includedMinutes: TEAM })).toBe(
      70,
    )
  })

  it('has nothing to estimate before the first accepted task', () => {
    expect(
      tasksAffordable({ usedMinutes: 900, minutesPerTask: 0, includedMinutes: TEAM }),
    ).toBeNull()
  })

  it('never goes below zero once the included minutes are spent', () => {
    expect(tasksAffordable({ usedMinutes: 3100, minutesPerTask: 30, includedMinutes: TEAM })).toBe(
      0,
    )
  })
})
