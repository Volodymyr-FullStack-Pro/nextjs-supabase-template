import 'server-only'

import { createSafeActionClient } from 'next-safe-action'

import {
  type ActionFailure,
  type DomainError,
  ForbiddenError,
  MfaRequiredError,
  toActionFailure,
  UNEXPECTED_ERROR,
} from '@/shared/domain/errors'
import { EnvironmentError } from '@/shared/infrastructure/env'
import { reportSlowAction, reportUnexpectedError } from '@/shared/infrastructure/monitoring'

import { isProduction } from './runtime'
import { sessionMfaStep, verifySession } from './session'

const SLOW_ACTION_MS = 1000

class ActionError extends Error {
  override readonly name = 'ActionError'
  constructor(readonly failure: ActionFailure) {
    super(failure.code)
  }
}

export function fail(error: DomainError): never {
  throw new ActionError(toActionFailure(error))
}

export const actionClient = createSafeActionClient({
  handleServerError(error): ActionFailure {
    if (error instanceof ActionError) return error.failure
    reportUnexpectedError('action-error', error)
    if (error instanceof EnvironmentError && !isProduction) {
      return { code: UNEXPECTED_ERROR, detail: error.message }
    }
    return { code: UNEXPECTED_ERROR }
  },
}).use(async ({ next }) => {
  const startedAt = performance.now()
  const result = await next()
  const durationMs = Math.round(performance.now() - startedAt)
  if (durationMs > SLOW_ACTION_MS) reportSlowAction(durationMs)
  return result
})

export const mfaActionClient = actionClient.use(async ({ next }) => {
  const session = await verifySession()
  return next({ ctx: { session } })
})

export const setupActionClient = mfaActionClient.use(async ({ next, ctx }) => {
  if (ctx.session.hasVerifiedFactor) fail(new ForbiddenError())
  return next()
})

export const authActionClient = mfaActionClient.use(async ({ next, ctx }) => {
  if (sessionMfaStep(ctx.session)) fail(new MfaRequiredError())
  return next()
})
