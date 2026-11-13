#!/usr/bin/env node
import { execFileSync } from 'node:child_process'

import {
  acceptedTaskIds,
  includedMinutesFrom,
  jobMinutes,
  tasksAffordable,
  usageForecast,
  warningMinutes,
} from './ci-usage-forecast.mjs'

const DAYS_PER_WEEK = 7
const MS_PER_DAY = 86_400_000
const PERCENT = 100
const ISO_DATE_LENGTH = 10
const OUTPUT_LIMIT_BYTES = 64 * 1024 * 1024
const USAGE_EXIT_CODE = 2
const FREE_EVENTS = new Set(['dynamic'])

const INCLUDED_MINUTES = includedMinutesFrom(process.env.CI_INCLUDED_MINUTES)
if (INCLUDED_MINUTES === undefined) {
  console.error(
    'CI_INCLUDED_MINUTES is a whole number of Actions minutes included in the organization plan (README, npm run ci:usage)',
  )
  process.exit(USAGE_EXIT_CODE)
}
const STATUS_TEXT = {
  ok: 'within the included minutes',
  warning: `above ${String(warningMinutes(INCLUDED_MINUTES))}: time to save minutes (README, npm run ci:usage)`,
  over: `above the included ${String(INCLUDED_MINUTES)}: $0.006 per minute until the budget runs out`,
}

const run = (command, args) =>
  execFileSync(command, args, { encoding: 'utf8', maxBuffer: OUTPUT_LIMIT_BYTES })
const nonEmptyLines = (text) => text.split('\n').filter((line) => line !== '')
const jsonLines = (text) => nonEmptyLines(text).map((line) => JSON.parse(line))

const now = new Date()
const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
const weekAgo = new Date(now.getTime() - DAYS_PER_WEEK * MS_PER_DAY)
const since = monthStart < weekAgo ? monthStart : weekAgo
const repository = run('gh', [
  'repo',
  'view',
  '--json',
  'nameWithOwner',
  '--jq',
  '.nameWithOwner',
]).trim()
const [owner] = repository.split('/')

const organizationRepositories = () => {
  try {
    return nonEmptyLines(
      run('gh', [
        'api',
        '--paginate',
        `orgs/${owner}/repos?type=private&per_page=100`,
        '--jq',
        '.[].full_name',
      ]),
    )
  } catch {
    return [repository]
  }
}

const runsOf = (fullName) =>
  jsonLines(
    run('gh', [
      'api',
      '--paginate',
      `repos/${fullName}/actions/runs?per_page=100&created=>=${since.toISOString().slice(0, ISO_DATE_LENGTH)}`,
      '--jq',
      '.workflow_runs[] | {id, event, created_at}',
    ]),
  )
    .filter((workflowRun) => !FREE_EVENTS.has(workflowRun.event))
    .map((workflowRun) => ({ ...workflowRun, fullName }))

const minutesOf = (workflowRun) =>
  jsonLines(
    run('gh', [
      'api',
      '--paginate',
      `repos/${workflowRun.fullName}/actions/runs/${String(workflowRun.id)}/jobs?filter=all&per_page=100`,
      '--jq',
      '.jobs[] | {started_at, completed_at}',
    ]),
  ).reduce((sum, job) => sum + jobMinutes(job), 0)

const repositories = organizationRepositories()
const measured = repositories.flatMap(runsOf).map((workflowRun) => ({
  created: new Date(workflowRun.created_at),
  minutes: minutesOf(workflowRun),
}))
const runsSince = (from) => measured.filter(({ created }) => created >= from)
const minutesIn = (list) => list.reduce((sum, { minutes }) => sum + minutes, 0)

const thisMonth = runsSince(monthStart)
const lastWeek = runsSince(weekAgo)
const usedMinutes = minutesIn(thisMonth)
const lastWeekMinutes = minutesIn(lastWeek)
const tasks = acceptedTaskIds(
  run('git', ['log', '--all', `--since=${weekAgo.toISOString()}`, '--format=%B']),
).size
const minutesPerTask = tasks === 0 ? 0 : Math.ceil(lastWeekMinutes / tasks)
const forecast = usageForecast({
  usedMinutes,
  lastWeekMinutes,
  now,
  includedMinutes: INCLUDED_MINUTES,
})
const affordable = tasksAffordable({
  usedMinutes,
  minutesPerTask,
  includedMinutes: INCLUDED_MINUTES,
})
const month = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })

console.info(
  `CI ${owner} (repositories: ${String(repositories.length)}), ${month}: ${String(usedMinutes)} of ${String(INCLUDED_MINUTES)} included min (${String(Math.round((usedMinutes * PERCENT) / INCLUDED_MINUTES))} %), runs ${String(thisMonth.length)}`,
)
console.info(
  `Last 7 days: ${String(lastWeekMinutes)} min, runs ${String(lastWeek.length)}, accepted tasks ${String(tasks)}${tasks === 0 ? '' : `, about ${String(minutesPerTask)} CI min per task`}`,
)
console.info(
  `Month-end forecast (${String(forecast.daysLeft)} days at last week's pace): ${String(forecast.projectedMinutes)} min, ${STATUS_TEXT[forecast.status]}`,
)
if (affordable !== null) {
  console.info(`Included minutes this month cover about ${String(affordable)} more tasks`)
}
