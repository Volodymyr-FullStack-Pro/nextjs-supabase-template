import { describe, expect, it } from 'vitest'
import {
  ConflictError,
  DomainError,
  ForbiddenError,
  NotFoundError,
  RuleViolationError,
} from '@/shared/domain/errors'
import { err, ok } from '@/shared/domain/result'

describe('domain errors', () => {
  it('carry a stable code with a human message', () => {
    expect(new NotFoundError('Заметка не найдена')).toMatchObject({
      code: 'NOT_FOUND',
      message: 'Заметка не найдена',
    })
  })

  it('distinguish forbidden and conflict by code', () => {
    expect(new ForbiddenError('Нет доступа').code).toBe('FORBIDDEN')
    expect(new ConflictError('Уже существует').code).toBe('CONFLICT')
  })

  it('keep the violated rule name on rule violations', () => {
    const error = new RuleViolationError('month.close.incomplete', 'Месяц не заполнен')
    expect(error).toBeInstanceOf(DomainError)
    expect(error.rule).toBe('month.close.incomplete')
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
