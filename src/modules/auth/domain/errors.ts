import { DomainError } from '@/shared/domain/errors'

export class InvalidCredentialsError extends DomainError {
  override readonly name = 'InvalidCredentialsError'
  readonly code = 'INVALID_CREDENTIALS'
}

export class TooManyAttemptsError extends DomainError {
  override readonly name = 'TooManyAttemptsError'
  readonly code = 'TOO_MANY_ATTEMPTS'
}

export class InvalidTotpCodeError extends DomainError {
  override readonly name = 'InvalidTotpCodeError'
  readonly code = 'INVALID_TOTP_CODE'
}

export class SecondFactorMissingError extends DomainError {
  override readonly name = 'SecondFactorMissingError'
  readonly code = 'SECOND_FACTOR_MISSING'
}
