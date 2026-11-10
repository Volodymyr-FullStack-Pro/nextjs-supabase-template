import { describe, expect, it } from 'vitest'

import { makeListNotes } from '@/modules/notes/application/list-notes'
import { fakeNotesRepository } from '@/modules/notes/infrastructure/notes-repository.fake'

const seed = [
  {
    id: 'n1',
    title: 'Аренда офиса',
    amount: '0.00',
    currency: 'EUR',
    clientRequestId: '00000000-0000-4000-8000-000000000001',
    createdAt: '2026-01-01T00:00:00.000Z',
    ownerId: 'u1',
  },
  {
    id: 'n2',
    title: 'Зарплаты',
    amount: '0.00',
    currency: 'EUR',
    clientRequestId: '00000000-0000-4000-8000-000000000002',
    createdAt: '2026-01-02T00:00:00.000Z',
    ownerId: 'u1',
  },
  {
    id: 'n3',
    title: 'Аренда склада',
    amount: '0.00',
    currency: 'EUR',
    clientRequestId: '00000000-0000-4000-8000-000000000003',
    createdAt: '2026-01-03T00:00:00.000Z',
    ownerId: 'u2',
  },
]
const listNotes = () => makeListNotes({ notes: fakeNotesRepository(seed).repository })

describe('listNotes', () => {
  it('lists only the notes of the current user, newest first', async () => {
    const items = await listNotes()({}, { userId: 'u1' })
    expect(items.map((note) => note.id)).toEqual(['n2', 'n1'])
  })

  it('filters by a case-insensitive substring of the title', async () => {
    const items = await listNotes()({ q: 'аренда' }, { userId: 'u1' })
    expect(items.map((note) => note.title)).toEqual(['Аренда офиса'])
  })

  it('normalizes the search text before filtering', async () => {
    const items = await listNotes()({ q: '  АРЕНДА\u200B ' }, { userId: 'u1' })
    expect(items.map((note) => note.title)).toEqual(['Аренда офиса'])
  })

  it('ignores the asterisk wildcard in the search text', async () => {
    const items = await listNotes()({ q: '*' }, { userId: 'u1' })
    expect(items).toHaveLength(2)
  })
})
