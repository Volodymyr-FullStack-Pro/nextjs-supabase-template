import 'server-only'

import * as Sentry from '@sentry/nextjs'

function describe(error: unknown) {
  if (error instanceof Error) return { error: error.name, message: error.message }
  return { error: typeof error }
}

export function reportUnexpectedError(type: string, error: unknown): void {
  console.error(JSON.stringify({ type, ...describe(error) }))
  Sentry.captureException(error)
}

const AUTH_FAILURE = 'auth-failure'

export function reportAuthFailure(code: string): void {
  console.warn(JSON.stringify({ type: AUTH_FAILURE, code }))
  Sentry.captureMessage(AUTH_FAILURE, {
    level: 'warning',
    tags: { code },
    fingerprint: [AUTH_FAILURE, code],
  })
}
