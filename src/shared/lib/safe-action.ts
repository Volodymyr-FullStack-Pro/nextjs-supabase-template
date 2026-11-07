import 'server-only'
import { createSafeActionClient } from 'next-safe-action'
import { EnvironmentError } from '@/shared/infrastructure/env'
import { DomainError } from '@/shared/domain/errors'
import { verifySession } from './session'

/** Ошибка, текст которой можно показать пользователю. Всё остальное наружу уходит общей фразой. */
class ActionError extends Error {
  override readonly name = 'ActionError'
}

/** Перевод ошибки домена (из Result use case) в ActionError: текст из домена безопасен для показа. */
export function fail(error: DomainError): never {
  throw new ActionError(error.message, { cause: error })
}

/** Базовый клиент Server Actions: Zod на входе, ошибки сервера — одной строкой без внутренних деталей. */
export const actionClient = createSafeActionClient({
  handleServerError(error) {
    console.error(error) // в проекте сюда же — Sentry.captureException(error)
    if (error instanceof ActionError) return error.message
    // имя недостающей переменной полезно разработчику, но в проде наружу не уходит
    if (error instanceof EnvironmentError && process.env.NODE_ENV !== 'production')
      return error.message
    return 'Что-то пошло не так. Попробуйте ещё раз.'
  },
})

/**
 * Клиент для действий авторизованных пользователей: сессия проверяется в middleware для каждого action,
 * а сам action получает ctx.session. Проверка на странице его не защищает — action вызывается прямым POST.
 */
export const authActionClient = actionClient.use(async ({ next }) => {
  const session = await verifySession()
  return next({ ctx: { session } })
})
