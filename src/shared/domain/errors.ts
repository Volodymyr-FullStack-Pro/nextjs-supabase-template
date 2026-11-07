export abstract class DomainError extends Error {
  abstract readonly code: string
}

export class NotFoundError extends DomainError {
  override readonly name = 'NotFoundError'
  readonly code = 'NOT_FOUND'
}

export class ForbiddenError extends DomainError {
  override readonly name = 'ForbiddenError'
  readonly code = 'FORBIDDEN'
}

export class ConflictError extends DomainError {
  override readonly name = 'ConflictError'
  readonly code = 'CONFLICT'
}

export class RuleViolationError extends DomainError {
  override readonly name = 'RuleViolationError'
  readonly code = 'RULE_VIOLATION'
  constructor(
    readonly rule: string,
    message: string,
  ) {
    super(message)
  }
}
