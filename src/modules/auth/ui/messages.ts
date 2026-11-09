import type { AuthErrorCode } from '../domain/errors'
import type { AuthMessageKey } from '../domain/message-keys'

export const authMessages = {
  'auth.email.invalid': 'Проверьте почту',
  'auth.password.required': 'Введите пароль',
  'auth.totp.codeFormat': 'Введите 6 цифр из приложения',
  INVALID_CREDENTIALS: 'Неверная почта или пароль',
  TOO_MANY_ATTEMPTS: 'Слишком много попыток, подождите минуту',
  INVALID_TOTP_CODE: 'Код не подошёл: введите новый код из приложения',
  SECOND_FACTOR_MISSING: 'Второй фактор не подключён',
} as const satisfies Record<AuthMessageKey | AuthErrorCode, string>
