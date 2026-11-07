import { err, ok, type Result } from '@/shared/domain/result'

import { InvalidCredentialsError } from '../domain/errors'
import type { SignInInput } from '../domain/sign-in'
import type { AuthGateway } from './auth-gateway'

export function makeSignIn({ auth }: { auth: AuthGateway }) {
  return async (input: SignInInput): Promise<Result<void, InvalidCredentialsError>> =>
    (await auth.signInWithPassword(input))
      ? ok(undefined)
      : err(new InvalidCredentialsError('Неверная почта или пароль'))
}
