import * as Sentry from '@sentry/nextjs'

import { env } from '@/shared/infrastructure/env'

function withoutRequestDetails(event: Sentry.ErrorEvent): Sentry.ErrorEvent {
  if (!event.request) return event
  const request = { ...event.request }
  delete request.headers
  delete request.cookies
  delete request.data
  return { ...event, request }
}

export function register() {
  const dsn = env.sentryDsn()
  if (!dsn) return
  Sentry.init({ dsn, beforeSend: withoutRequestDetails })
}

export const onRequestError = Sentry.captureRequestError
