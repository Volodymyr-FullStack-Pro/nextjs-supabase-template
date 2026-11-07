/** Ошибки домена: код для программ, сообщение для людей. Наружу (в action) уходят через Result, не исключением. */
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

/** Нарушено бизнес-правило (например, нельзя закрыть месяц с незаполненной выручкой). */
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
