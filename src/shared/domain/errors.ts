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

export class MfaRequiredError extends DomainError {
  override readonly name = 'MfaRequiredError'
  readonly code = 'MFA_REQUIRED'
}

export class RuleViolationError extends DomainError {
  override readonly name = 'RuleViolationError'
  readonly code = 'RULE_VIOLATION'
  constructor(readonly rule: string) {
    super(rule)
  }
}

export const UNEXPECTED_ERROR = 'UNEXPECTED'

export type ActionFailure = { code: string; rule?: string; detail?: string }

export function toActionFailure(error: DomainError): ActionFailure {
  return error instanceof RuleViolationError
    ? { code: error.code, rule: error.rule }
    : { code: error.code }
}
