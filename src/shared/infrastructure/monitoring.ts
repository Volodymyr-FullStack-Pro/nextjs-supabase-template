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
