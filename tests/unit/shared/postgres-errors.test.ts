import { describe, expect, it, vi } from 'vitest'

import {
  databaseError,
  violatesUniqueConstraint,
} from '@/shared/infrastructure/supabase/postgres-errors'

vi.mock('server-only', () => ({}))

const REQUEST_KEY = 'notes_owner_id_client_request_id_key'
const duplicate = (constraint: string) => ({
  code: '23505',
  message: `duplicate key value violates unique constraint "${constraint}"`,
})

describe('violatesUniqueConstraint', () => {
  it('recognises the violation of the named constraint', () => {
    expect(violatesUniqueConstraint(duplicate(REQUEST_KEY), REQUEST_KEY)).toBe(true)
  })

  it.each([
    ['another unique constraint of the same table', duplicate('notes_title_key')],
    ['a constraint whose name only starts the same', duplicate(`${REQUEST_KEY}_2`)],
    [
      'another error that mentions the constraint',
      { code: '23514', message: `violates check constraint "${REQUEST_KEY}"` },
    ],
    ['no error', null],
  ])('does not take %s for it', (_case, error) => {
    expect(violatesUniqueConstraint(error, REQUEST_KEY)).toBe(false)
  })
})

describe('databaseError', () => {
  const rejected = {
    code: '22P02',
    message: 'invalid input syntax for type numeric: "12 345,67"',
    details: 'Failing row contains (7, Аренда, 12 345,67).',
    hint: 'Проверьте сумму 12 345,67',
  }

  it('names the operation and the code of the database error', () => {
    expect(databaseError('notes.insert', rejected).message).toBe('notes.insert: 22P02')
  })

  it('carries neither the text of the database error nor the error itself', () => {
    const failure = databaseError('notes.insert', rejected)

    expect(failure.cause).toBeUndefined()
    expect(JSON.stringify(Object.entries(failure))).toBe('[]')
    expect(`${String(failure)} ${failure.stack ?? ''}`).not.toContain('12 345,67')
  })

  it('still names the operation when the error has no code', () => {
    expect(databaseError('notes.list', { code: '' }).message).toBe('notes.list: unknown')
    expect(databaseError('notes.list', {}).message).toBe('notes.list: unknown')
  })
})
