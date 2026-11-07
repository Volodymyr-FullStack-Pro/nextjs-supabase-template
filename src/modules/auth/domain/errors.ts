import { DomainError } from '@/shared/domain/errors'

export class InvalidCredentialsError extends DomainError {
  override readonly name = 'InvalidCredentialsError'
  readonly code = 'INVALID_CREDENTIALS'
}

export class TooManyAttemptsError extends DomainError {
  override readonly name = 'TooManyAttemptsError'
  readonly code = 'TOO_MANY_ATTEMPTS'
}
