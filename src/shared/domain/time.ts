import { DEFAULT_LOCALE } from './locale'

export const APP_TIME_ZONE = 'Europe/Berlin'

type DateFormat = { locale?: string; timeZone?: string }

const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/u
const DAY_LENGTH = 10

export function isCalendarDay(day: string): boolean {
  if (!DAY_PATTERN.test(day)) return false
  const parsed = new Date(`${day}T00:00:00Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, DAY_LENGTH) === day
}

export function formatDate(
  iso: string,
  { locale = DEFAULT_LOCALE, timeZone = APP_TIME_ZONE }: DateFormat = {},
): string {
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone,
  }).format(new Date(iso))
}

export function formatDay(
  day: string,
  { locale = DEFAULT_LOCALE }: Pick<DateFormat, 'locale'> = {},
): string {
  if (!isCalendarDay(day)) {
    throw new RangeError(`formatDay: expected a calendar date YYYY-MM-DD, got ${day}`)
  }
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${day}T00:00:00Z`))
}
