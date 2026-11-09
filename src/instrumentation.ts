import * as Sentry from '@sentry/nextjs'

import { env } from '@/shared/infrastructure/env'

export function register() {
  const dsn = env.sentryDsn()
  if (!dsn) return
  Sentry.init({ dsn })
}

export const onRequestError = Sentry.captureRequestError
