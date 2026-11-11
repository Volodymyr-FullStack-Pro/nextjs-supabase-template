import { beforeEach, describe, expect, it, vi } from 'vitest'

import { supabaseNotesRepository } from '@/modules/notes/infrastructure/notes-repository.supabase'

type DatabaseError = { code: string; message: string; details: string; hint: string }
type Reply = { data: unknown; error: DatabaseError | null }

const database = vi.hoisted(() => {
  const replies: Reply[] = []
  const query = () => {
    const builder: Record<string, unknown> = {}
    for (const method of ['select', 'insert', 'eq', 'order', 'limit', 'ilike', 'single']) {
      builder[method] = () => builder
    }
    builder['then'] = (resolve: (reply: Reply | undefined) => unknown) => resolve(replies.shift())
    return builder
  }
  return { replies, client: { from: query } }
})

vi.mock('server-only', () => ({}))
vi.mock('@/shared/infrastructure/supabase/server', () => ({
  createClient: () => Promise.resolve(database.client),
}))

const REJECTED_AMOUNT = '12 345,67'
const REQUEST_KEY = 'notes_owner_id_client_request_id_key'
const NEW_NOTE = {
  ownerId: 'user-1',
  title: 'Аренда офиса',
  amount: '10.50',
  currency: 'EUR',
  clientRequestId: '00000000-0000-4000-8000-000000000001',
}
const STORED_ROW = {
  id: 'note-1',
  title: 'Аренда офиса',
  amount: '10.50',
  currency: 'EUR',
  created_at: '2026-11-10T10:00:00+00:00',
}
const STORED_NOTE = {
  id: 'note-1',
  title: 'Аренда офиса',
  amount: '10.50',
  currency: 'EUR',
  createdAt: '2026-11-10T10:00:00+00:00',
}

const refused = (code: string, message: string): Reply => ({
  data: null,
  error: { code, message, details: `Failing row contains (${REJECTED_AMOUNT}).`, hint: '' },
})
const invalidAmount = refused(
  '22P02',
  `invalid input syntax for type numeric: "${REJECTED_AMOUNT}"`,
)
const duplicateOf = (constraint: string) =>
  refused('23505', `duplicate key value violates unique constraint "${constraint}"`)

async function failureOf(operation: Promise<unknown>): Promise<Error> {
  const failure: unknown = await operation.then(
    () => new Error('операция не отклонена'),
    (error: unknown) => error,
  )
  if (!(failure instanceof Error)) throw new TypeError('отклонено не ошибкой')
  return failure
}

describe('supabaseNotesRepository', () => {
  beforeEach(() => {
    database.replies.length = 0
  })

  it.each([
    ['notes.list', () => supabaseNotesRepository.listForUser('user-1', {})],
    ['notes.insert', () => supabaseNotesRepository.insert(NEW_NOTE)],
  ])(
    'reports a refusal of the database as %s and its code, without the text',
    async (name, run) => {
      database.replies.push(invalidAmount)

      const failure = await failureOf(run())

      expect(failure.message).toBe(`${name}: 22P02`)
      expect(failure.cause).toBeUndefined()
      expect(`${String(failure)} ${failure.stack ?? ''}`).not.toContain(REJECTED_AMOUNT)
    },
  )

  it('reports a failed lookup of the already saved note the same way', async () => {
    database.replies.push(duplicateOf(REQUEST_KEY), refused('42501', 'permission denied'))

    const failure = await failureOf(supabaseNotesRepository.insert(NEW_NOTE))

    expect(failure.message).toBe('notes.findByRequest: 42501')
    expect(failure.cause).toBeUndefined()
  })

  it('returns the inserted note as a new one', async () => {
    database.replies.push({ data: STORED_ROW, error: null })

    await expect(supabaseNotesRepository.insert(NEW_NOTE)).resolves.toEqual({
      note: STORED_NOTE,
      repeatedRequest: false,
    })
  })

  it('returns the already saved note when the request key is repeated', async () => {
    database.replies.push(duplicateOf(REQUEST_KEY), { data: STORED_ROW, error: null })

    await expect(supabaseNotesRepository.insert(NEW_NOTE)).resolves.toEqual({
      note: STORED_NOTE,
      repeatedRequest: true,
    })
  })

  it('does not take the violation of another unique constraint for a repeated request', async () => {
    database.replies.push(duplicateOf('notes_title_key'), { data: STORED_ROW, error: null })

    const failure = await failureOf(supabaseNotesRepository.insert(NEW_NOTE))

    expect(failure.message).toBe('notes.insert: 23505')
  })

  it('lists the notes of the user', async () => {
    database.replies.push({ data: [STORED_ROW], error: null })

    await expect(supabaseNotesRepository.listForUser('user-1', { q: 'аренда' })).resolves.toEqual([
      STORED_NOTE,
    ])
  })
})
