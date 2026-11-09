import 'server-only'

import { createSafeActionClient } from 'next-safe-action'

import { type DomainError, MfaRequiredError } from '@/shared/domain/errors'
import { EnvironmentError } from '@/shared/infrastructure/env'
import { reportUnexpectedError } from '@/shared/infrastructure/monitoring'

import { isProduction } from './runtime'
import { sessionMfaStep, verifySession } from './session'

class ActionError extends Error {
  override readonly name = 'ActionError'
}

export function fail(error: DomainError): never {
  throw new ActionError(error.message, { cause: error })
}

export const actionClient = createSafeActionClient({
  handleServerError(error) {
    if (error instanceof ActionError) return error.message
    reportUnexpectedError('action-error', error)
    if (error instanceof EnvironmentError && !isProduction) return error.message
    return 'Что-то пошло не так. Попробуйте ещё раз.'
  },
})

export const mfaActionClient = actionClient.use(async ({ next }) => {
  const session = await verifySession()
  return next({ ctx: { session } })
})

export const authActionClient = mfaActionClient.use(async ({ next, ctx }) => {
  if (sessionMfaStep(ctx.session))
    fail(new MfaRequiredError('Подтвердите вход кодом из приложения'))
  return next()
})
