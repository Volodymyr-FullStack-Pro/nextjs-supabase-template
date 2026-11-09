import { err, ok, type Result } from '@/shared/domain/result'

import { InvalidCredentialsError, TooManyAttemptsError } from '../domain/errors'
import type { SignInInput } from '../domain/sign-in'
import type { AuthGateway } from './auth-gateway'

export type SignInError = InvalidCredentialsError | TooManyAttemptsError

export function makeSignIn({ auth }: { auth: Pick<AuthGateway, 'signInWithPassword'> }) {
  return async (input: SignInInput): Promise<Result<void, SignInError>> => {
    const outcome = await auth.signInWithPassword(input)
    if (outcome === 'invalid-credentials') {
      return err(new InvalidCredentialsError())
    }
    if (outcome === 'too-many-attempts') {
      return err(new TooManyAttemptsError())
    }
    return ok(undefined)
  }
}
