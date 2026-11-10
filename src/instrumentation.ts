import * as Sentry from '@sentry/nextjs'

import { env } from '@/shared/infrastructure/env'

function withoutQuery(url: string): string {
  return url.split('?')[0] ?? url
}

export function withoutRequestDetails(event: Sentry.ErrorEvent): Sentry.ErrorEvent {
  if (!event.request) return event
  const request = { ...event.request }
  delete request.headers
  delete request.cookies
  delete request.data
  delete request.query_string
  if (request.url !== undefined) request.url = withoutQuery(request.url)
  return { ...event, request }
}

export function register() {
  const dsn = env.sentryDsn()
  if (!dsn) return
  Sentry.init({
    dsn,
    dataCollection: { urlQueryParams: false },
    beforeSend: withoutRequestDetails,
  })
}

export const onRequestError = Sentry.captureRequestError
