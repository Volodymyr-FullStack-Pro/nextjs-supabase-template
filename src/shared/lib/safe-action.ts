import 'server-only'

import { createSafeActionClient } from 'next-safe-action'

import {
  type ActionFailure,
  type DomainError,
  MfaRequiredError,
  toActionFailure,
  UNEXPECTED_ERROR,
} from '@/shared/domain/errors'
import { EnvironmentError } from '@/shared/infrastructure/env'
import { reportUnexpectedError } from '@/shared/infrastructure/monitoring'

import { isProduction } from './runtime'
import { sessionMfaStep, verifySession } from './session'

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
})

export const mfaActionClient = actionClient.use(async ({ next }) => {
  const session = await verifySession()
  return next({ ctx: { session } })
})

export const authActionClient = mfaActionClient.use(async ({ next, ctx }) => {
  if (sessionMfaStep(ctx.session)) fail(new MfaRequiredError())
  return next()
})
