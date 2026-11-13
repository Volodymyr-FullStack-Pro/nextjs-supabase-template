import { describe, expect, it } from 'vitest'

import { failureMessage, messageFor } from '@/shared/ui/form/messages'

const moduleMessages = {
  'note.title.meaningless': 'Заголовок должен содержать буквы или цифры',
  INVALID_CREDENTIALS: 'Неверная почта или пароль',
}

describe('failureMessage', () => {
  it('shows the text of the violated rule', () => {
    expect(
      failureMessage({ code: 'RULE_VIOLATION', rule: 'note.title.meaningless' }, moduleMessages),
    ).toBe('Заголовок должен содержать буквы или цифры')
  })

  it('shows the module text of an error code', () => {
    expect(failureMessage({ code: 'INVALID_CREDENTIALS' }, moduleMessages)).toBe(
      'Неверная почта или пароль',
    )
  })

  it('falls back to the shared text of a common code', () => {
    expect(failureMessage({ code: 'MFA_REQUIRED' }, moduleMessages)).toBe(
      'Подтвердите вход кодом из приложения',
    )
  })

  it('shows the developer detail of an unexpected error outside production', () => {
    expect(
      failureMessage({ code: 'UNEXPECTED', detail: 'Environment variable is not set' }, {}),
    ).toBe('Environment variable is not set')
  })

  it('shows the generic text for an unknown or missing failure', () => {
    expect(failureMessage({ code: 'SOMETHING_NEW' }, moduleMessages)).toBe(
      'Что-то пошло не так. Попробуйте ещё раз.',
    )
    expect(failureMessage(undefined, moduleMessages)).toBe(
      'Что-то пошло не так. Попробуйте ещё раз.',
    )
  })
})

describe('messageFor', () => {
  it('translates a validation key and leaves an unknown key unresolved', () => {
    expect(messageFor('INVALID_CREDENTIALS', moduleMessages)).toBe('Неверная почта или пароль')
    expect(messageFor('auth.unknown', moduleMessages)).toBeUndefined()
    expect(messageFor(undefined, moduleMessages)).toBeUndefined()
  })
})
