export const APP_TIME_ZONE = 'Europe/Berlin'
export const APP_LOCALE = 'ru-RU'

type DateFormat = { locale?: string; timeZone?: string }

export function formatDate(
  iso: string,
  { locale = APP_LOCALE, timeZone = APP_TIME_ZONE }: DateFormat = {},
): string {
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone,
  }).format(new Date(iso))
}
