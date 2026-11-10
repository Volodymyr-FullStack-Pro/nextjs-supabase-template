import { describe, expect, it } from 'vitest'

import { makeCreateNote } from '@/modules/notes/application/create-note'
import { fakeNotesRepository } from '@/modules/notes/infrastructure/notes-repository.fake'

describe('createNote', () => {
  it('stores the title and the exact amount for the current user', async () => {
    const { repository, rows } = fakeNotesRepository()
    const createNote = makeCreateNote({ notes: repository })

    const result = await createNote(
      { title: 'Аренда офиса', amount: '1234567890123456.78' },
      { userId: 'u1' },
    )

    expect(result.ok).toBe(true)
    expect(rows).toEqual([
      expect.objectContaining({
        title: 'Аренда офиса',
        amount: '1234567890123456.78',
        ownerId: 'u1',
      }),
    ])
  })

  it('rejects a title without letters or digits', async () => {
    const { repository, rows } = fakeNotesRepository()
    const createNote = makeCreateNote({ notes: repository })

    const result = await createNote({ title: '--- !!!', amount: '1' }, { userId: 'u1' })

    expect(result).toMatchObject({
      ok: false,
      error: { code: 'RULE_VIOLATION', rule: 'note.title.meaningless' },
    })
    expect(rows).toHaveLength(0)
  })
})
