import { describe, expect, it } from 'vitest'
import { makeListNotes } from '@/modules/notes/application/list-notes'
import { fakeNotesRepository } from '@/modules/notes/infrastructure/notes-repository.fake'

const seed = [
  { id: 'n1', title: 'Аренда офиса', createdAt: '2026-01-01T00:00:00.000Z', ownerId: 'u1' },
  { id: 'n2', title: 'Зарплаты', createdAt: '2026-01-02T00:00:00.000Z', ownerId: 'u1' },
  { id: 'n3', title: 'Аренда склада', createdAt: '2026-01-03T00:00:00.000Z', ownerId: 'u2' },
]

describe('listNotes', () => {
  it('lists only the notes of the current user', async () => {
    const listNotes = makeListNotes({ notes: fakeNotesRepository(seed).repo })
    const items = await listNotes({}, { userId: 'u1' })
    expect(items.map((n) => n.id)).toEqual(['n1', 'n2'])
  })

  it('filters by a case-insensitive substring of the title', async () => {
    const listNotes = makeListNotes({ notes: fakeNotesRepository(seed).repo })
    const items = await listNotes({ q: 'аренда' }, { userId: 'u1' })
    expect(items.map((n) => n.title)).toEqual(['Аренда офиса'])
  })
})
