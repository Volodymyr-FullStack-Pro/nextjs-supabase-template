import * as Sentry from '@sentry/nextjs'

import { env } from '@/shared/infrastructure/env'

type SentryOptions = NonNullable<Parameters<typeof Sentry.init>[0]>

const COLLECT_NOTHING = {
  userInfo: false,
  cookies: false,
  httpHeaders: false,
  httpBodies: [],
  urlQueryParams: false,
  graphQL: { document: false, variables: false },
  genAI: { inputs: false, outputs: false },
  mcp: { inputs: false, outputs: false },
  databaseQueryData: false,
  queues: false,
  stackFrameVariables: false,
} satisfies SentryOptions['dataCollection']

function withoutQuery(url: string): string {
  return url.split('?')[0] ?? url
}

function withoutRequestBodyAndHeaders(request: NonNullable<Sentry.ErrorEvent['request']>) {
  const safe = { ...request }
  delete safe.headers
  delete safe.cookies
  delete safe.data
  delete safe.query_string
  if (safe.url !== undefined) safe.url = withoutQuery(safe.url)
  return safe
}

export function withoutRequestDetails(event: Sentry.ErrorEvent): Sentry.ErrorEvent {
  const safe = { ...event }
  delete safe.user
  if (safe.request) safe.request = withoutRequestBodyAndHeaders(safe.request)
  return safe
}

export function sentryOptions(dsn: string) {
  return {
    dsn,
    dataCollection: COLLECT_NOTHING,
    beforeSend: withoutRequestDetails,
  } satisfies SentryOptions
}

export function register() {
  const dsn = env.sentryDsn()
  if (!dsn) return
  Sentry.init(sentryOptions(dsn))
}

export const onRequestError = Sentry.captureRequestError
