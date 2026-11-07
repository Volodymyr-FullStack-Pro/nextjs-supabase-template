import { DomainError } from '@/shared/domain/errors'

export class InvalidCredentialsError extends DomainError {
  override readonly name = 'InvalidCredentialsError'
  readonly code = 'INVALID_CREDENTIALS'
}
