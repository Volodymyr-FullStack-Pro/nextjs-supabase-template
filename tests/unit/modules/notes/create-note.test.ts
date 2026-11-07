import { describe, expect, it } from 'vitest'
import { makeCreateNote } from '@/modules/notes/application/create-note'
import { fakeNotesRepository } from '@/modules/notes/infrastructure/notes-repository.fake'

describe('createNote', () => {
  it('stores the normalized title for the current user', async () => {
    const { repository, rows } = fakeNotesRepository()
    const createNote = makeCreateNote({ notes: repository })

    const result = await createNote({ title: '  Аренда   офиса ' }, { userId: 'u1' })

    expect(result.ok).toBe(true)
    expect(rows).toEqual([expect.objectContaining({ title: 'Аренда офиса', ownerId: 'u1' })])
  })

  it('rejects a title that is empty after normalization', async () => {
    const { repository, rows } = fakeNotesRepository()
    const createNote = makeCreateNote({ notes: repository })

    const result = await createNote({ title: '   ' }, { userId: 'u1' })

    expect(result).toMatchObject({
      ok: false,
      error: { code: 'RULE_VIOLATION', rule: 'note.title.empty' },
    })
    expect(rows).toHaveLength(0)
  })
})
