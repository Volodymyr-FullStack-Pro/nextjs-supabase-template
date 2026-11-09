import { DEFAULT_LOCALE } from './locale'

export const APP_TIME_ZONE = 'Europe/Berlin'

type DateFormat = { locale?: string; timeZone?: string }

const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/u

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
  if (!DAY_PATTERN.test(day)) {
    throw new RangeError(`formatDay: ожидается календарная дата YYYY-MM-DD, получено ${day}`)
  }
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${day}T00:00:00Z`))
}
