export const DEFAULT_INCLUDED_MINUTES = 3000

const WARNING_SHARE = 2 / 3
const MS_PER_MINUTE = 60_000
const MS_PER_DAY = 86_400_000
const DAYS_PER_WEEK = 7
const ACCEPTED_TASK_LINE = /^(?:\* )?(B\d{2}-T\d{2}):/gmu
const WHOLE_NUMBER = /^\d+$/u

export function includedMinutesFrom(value) {
  const text = value?.trim() ?? ''
  if (text === '') return DEFAULT_INCLUDED_MINUTES
  if (!WHOLE_NUMBER.test(text)) return undefined
  const minutes = Number.parseInt(text, 10)
  return minutes > 0 ? minutes : undefined
}

export function warningMinutes(includedMinutes) {
  return Math.round(includedMinutes * WARNING_SHARE)
}

export function jobMinutes({ started_at: startedAt, completed_at: completedAt }) {
  if (!startedAt || !completedAt) return 0
  return Math.ceil((Date.parse(completedAt) - Date.parse(startedAt)) / MS_PER_MINUTE)
}

function statusOf(projectedMinutes, includedMinutes) {
  if (projectedMinutes > includedMinutes) return 'over'
  if (projectedMinutes >= warningMinutes(includedMinutes)) return 'warning'
  return 'ok'
}

export function usageForecast({ usedMinutes, lastWeekMinutes, now, includedMinutes }) {
  const nextMonth = Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)
  const daysLeft = (nextMonth - now.getTime()) / MS_PER_DAY
  const projectedMinutes = usedMinutes + Math.ceil((lastWeekMinutes * daysLeft) / DAYS_PER_WEEK)
  return {
    daysLeft: Math.ceil(daysLeft),
    projectedMinutes,
    status: statusOf(projectedMinutes, includedMinutes),
  }
}

export function tasksAffordable({ usedMinutes, minutesPerTask, includedMinutes }) {
  if (minutesPerTask === 0) return null
  return Math.max(0, Math.floor((includedMinutes - usedMinutes) / minutesPerTask))
}

export function acceptedTaskIds(commitMessages) {
  return new Set(Array.from(commitMessages.matchAll(ACCEPTED_TASK_LINE), ([, taskId]) => taskId))
}
