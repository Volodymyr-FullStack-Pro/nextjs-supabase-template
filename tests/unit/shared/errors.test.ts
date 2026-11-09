import { describe, expect, it } from 'vitest'

import {
  ConflictError,
  DomainError,
  ForbiddenError,
  MfaRequiredError,
  NotFoundError,
  RuleViolationError,
  toActionFailure,
} from '@/shared/domain/errors'
import { err, ok } from '@/shared/domain/result'

describe('domain errors', () => {
  it('carry a stable code instead of a text for the user', () => {
    expect(new NotFoundError().code).toBe('NOT_FOUND')
    expect(new ForbiddenError().code).toBe('FORBIDDEN')
    expect(new ConflictError().code).toBe('CONFLICT')
    expect(new MfaRequiredError().code).toBe('MFA_REQUIRED')
  })

  it('keep the violated rule name on rule violations', () => {
    const error = new RuleViolationError('month.close.incomplete')
    expect(error).toBeInstanceOf(DomainError)
    expect(error.rule).toBe('month.close.incomplete')
  })

  it('turn into an action failure with the code and, for a rule, its name', () => {
    expect(toActionFailure(new NotFoundError())).toEqual({ code: 'NOT_FOUND' })
    expect(toActionFailure(new RuleViolationError('month.close.incomplete'))).toEqual({
      code: 'RULE_VIOLATION',
      rule: 'month.close.incomplete',
    })
  })
})

describe('Result', () => {
  it('wraps a value as ok', () => {
    expect(ok(1)).toEqual({ ok: true, value: 1 })
  })

  it('wraps an error as not ok', () => {
    expect(err('nope')).toEqual({ ok: false, error: 'nope' })
  })
})
