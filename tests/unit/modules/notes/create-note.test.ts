import { describe, expect, it } from 'vitest'

import { makeCreateNote } from '@/modules/notes/application/create-note'
import { fakeNotesRepository } from '@/modules/notes/infrastructure/notes-repository.fake'

const REQUEST_ID = '00000000-0000-4000-8000-000000000001'
const input = {
  title: 'Аренда офиса',
  amount: '10.50',
  currency: 'EUR',
  clientRequestId: REQUEST_ID,
}

describe('createNote', () => {
  it('stores the title, the exact amount and its currency for the current user', async () => {
    const { repository, rows } = fakeNotesRepository()
    const createNote = makeCreateNote({ notes: repository })

    const result = await createNote(
      { ...input, amount: '1234567890123456.78', currency: 'CHF' },
      { userId: 'u1' },
    )

    expect(result.ok).toBe(true)
    expect(rows).toEqual([
      expect.objectContaining({
        title: 'Аренда офиса',
        amount: '1234567890123456.78',
        currency: 'CHF',
        clientRequestId: REQUEST_ID,
        ownerId: 'u1',
      }),
    ])
  })

  it('rejects a title without letters or digits', async () => {
    const { repository, rows } = fakeNotesRepository()
    const createNote = makeCreateNote({ notes: repository })

    const result = await createNote({ ...input, title: '--- !!!' }, { userId: 'u1' })

    expect(result).toMatchObject({
      ok: false,
      error: { code: 'RULE_VIOLATION', rule: 'note.title.meaningless' },
    })
    expect(rows).toHaveLength(0)
  })

  it('rejects an amount more precise than its currency', async () => {
    const { repository, rows } = fakeNotesRepository()
    const createNote = makeCreateNote({ notes: repository })

    const result = await createNote(
      { ...input, amount: '100.50', currency: 'JPY' },
      { userId: 'u1' },
    )

    expect(result).toMatchObject({
      ok: false,
      error: { code: 'RULE_VIOLATION', rule: 'note.amount.tooPrecise' },
    })
    expect(rows).toHaveLength(0)
  })

  it('returns the already created note for a repeated request id', async () => {
    const { repository, rows } = fakeNotesRepository()
    const createNote = makeCreateNote({ notes: repository })

    const first = await createNote(input, { userId: 'u1' })
    const repeated = await createNote(input, { userId: 'u1' })

    expect(repeated).toEqual(first)
    expect(rows).toHaveLength(1)
  })
})
