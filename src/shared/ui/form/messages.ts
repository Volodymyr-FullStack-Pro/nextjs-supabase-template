import { type ActionFailure, UNEXPECTED_ERROR } from '@/shared/domain/errors'

export type Messages = Readonly<Record<string, string>>

const commonMessages = {
  [UNEXPECTED_ERROR]: 'Что-то пошло не так. Попробуйте ещё раз.',
  MFA_REQUIRED: 'Подтвердите вход кодом из приложения',
  NOT_FOUND: 'Запись не найдена',
  FORBIDDEN: 'Нет доступа',
  CONFLICT: 'Запись уже изменили: обновите страницу',
  RULE_VIOLATION: 'Действие нарушает правило',
} as const satisfies Messages
const commonLookup: Messages = commonMessages

export function messageFor(key: string | undefined, messages: Messages): string | undefined {
  if (key === undefined) return undefined
  return messages[key] ?? commonLookup[key]
}

export function failureMessage(failure: ActionFailure | undefined, messages: Messages): string {
  return (
    failure?.detail ??
    messageFor(failure?.rule, messages) ??
    messageFor(failure?.code, messages) ??
    commonMessages[UNEXPECTED_ERROR]
  )
}
