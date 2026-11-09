import { DEFAULT_LOCALE } from './locale'

export const APP_TIME_ZONE = 'Europe/Berlin'

type DateFormat = { locale?: string; timeZone?: string }

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
