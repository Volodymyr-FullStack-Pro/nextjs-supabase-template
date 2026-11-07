import 'server-only'

import { createSafeActionClient } from 'next-safe-action'

import type { DomainError } from '@/shared/domain/errors'
import { EnvironmentError } from '@/shared/infrastructure/env'

import { isProduction } from './runtime'
import { verifySession } from './session'

class ActionError extends Error {
  override readonly name = 'ActionError'
}

export function fail(error: DomainError): never {
  throw new ActionError(error.message, { cause: error })
}

export const actionClient = createSafeActionClient({
  handleServerError(error) {
    console.error(error)
    if (error instanceof ActionError) return error.message
    if (error instanceof EnvironmentError && !isProduction) return error.message
    return 'Что-то пошло не так. Попробуйте ещё раз.'
  },
})

export const authActionClient = actionClient.use(async ({ next }) => {
  const session = await verifySession()
  return next({ ctx: { session } })
})
