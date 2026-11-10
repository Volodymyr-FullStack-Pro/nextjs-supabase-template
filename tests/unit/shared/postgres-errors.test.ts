import { describe, expect, it, vi } from 'vitest'

import { violatesUniqueConstraint } from '@/shared/infrastructure/supabase/postgres-errors'

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
