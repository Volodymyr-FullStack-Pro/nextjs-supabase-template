import { beforeEach, describe, expect, it, vi } from 'vitest'

import { supabase__ModuleName__Repository } from '@/modules/__module-name__/infrastructure/__module-name__-repository.supabase'

type DatabaseError = { code: string; message: string; details: string; hint: string }
type Reply = { data: unknown; error: DatabaseError | null }

const database = vi.hoisted(() => {
  const replies: Reply[] = []
  const query = () => {
    const builder: Record<string, unknown> = {}
    for (const method of ['select', 'insert', 'eq', 'order', 'limit', 'single']) {
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
const REQUEST_KEY = '__module_name___owner_id_client_request_id_key'
const NEW___ENTITY_NAME__ = {
  ownerId: 'user-1',
  title: 'Аренда офиса',
  amount: '10.50',
  currency: 'EUR',
  clientRequestId: '00000000-0000-4000-8000-000000000001',
}
const STORED_ROW = {
  id: '__entity-name__-1',
  title: 'Аренда офиса',
  amount: '10.50',
  currency: 'EUR',
  created_at: '2026-11-10T10:00:00+00:00',
}
const STORED___ENTITY_NAME__ = {
  id: '__entity-name__-1',
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
    () => new Error('operation was not rejected'),
    (error: unknown) => error,
  )
  if (!(failure instanceof Error)) throw new TypeError('rejected with a non-error value')
  return failure
}

describe('supabase__ModuleName__Repository', () => {
  beforeEach(() => {
    database.replies.length = 0
  })

  it.each([
    ['__moduleName__.list', () => supabase__ModuleName__Repository.listForUser('user-1')],
    ['__moduleName__.insert', () => supabase__ModuleName__Repository.insert(NEW___ENTITY_NAME__)],
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

  it('reports a failed lookup of the already saved record the same way', async () => {
    database.replies.push(duplicateOf(REQUEST_KEY), refused('42501', 'permission denied'))

    const failure = await failureOf(supabase__ModuleName__Repository.insert(NEW___ENTITY_NAME__))

    expect(failure.message).toBe('__moduleName__.findByRequest: 42501')
    expect(failure.cause).toBeUndefined()
  })

  it('returns the inserted record as a new one', async () => {
    database.replies.push({ data: STORED_ROW, error: null })

    await expect(supabase__ModuleName__Repository.insert(NEW___ENTITY_NAME__)).resolves.toEqual({
      __entityName__: STORED___ENTITY_NAME__,
      repeatedRequest: false,
    })
  })

  it('returns the already saved record when the request key is repeated', async () => {
    database.replies.push(duplicateOf(REQUEST_KEY), { data: STORED_ROW, error: null })

    await expect(supabase__ModuleName__Repository.insert(NEW___ENTITY_NAME__)).resolves.toEqual({
      __entityName__: STORED___ENTITY_NAME__,
      repeatedRequest: true,
    })
  })

  it('does not take the violation of another unique constraint for a repeated request', async () => {
    database.replies.push(duplicateOf('__module_name___title_key'), {
      data: STORED_ROW,
      error: null,
    })

    const failure = await failureOf(supabase__ModuleName__Repository.insert(NEW___ENTITY_NAME__))

    expect(failure.message).toBe('__moduleName__.insert: 23505')
  })

  it('lists the records of the user', async () => {
    database.replies.push({ data: [STORED_ROW], error: null })

    await expect(supabase__ModuleName__Repository.listForUser('user-1')).resolves.toEqual([
      STORED___ENTITY_NAME__,
    ])
  })
})
