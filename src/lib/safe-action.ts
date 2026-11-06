import 'server-only'
import { createSafeActionClient } from 'next-safe-action'
import { verifySession } from '@/data/session'

/** Ошибка, текст которой можно показать пользователю. Всё остальное наружу уходит общей фразой. */
export class ActionError extends Error {
  override readonly name = 'ActionError'
}

/** Базовый клиент Server Actions: Zod на входе, ошибки сервера — одной строкой без внутренних деталей. */
export const actionClient = createSafeActionClient({
  handleServerError(error) {
    console.error(error) // в проекте сюда же — Sentry.captureException(error)
    return error instanceof ActionError ? error.message : 'Что-то пошло не так. Попробуйте ещё раз.'
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
