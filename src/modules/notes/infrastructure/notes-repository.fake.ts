import type { NotesRepository } from '../application/notes-repository'
import type { Note } from '../domain/note'

type StoredNote = Note & { ownerId: string }

export function fakeNotesRepository(seed: StoredNote[] = []) {
  const rows: StoredNote[] = [...seed]
  const repository: NotesRepository = {
    listForUser: (userId, filter) => {
      const search = filter.q?.replaceAll('*', '').toLowerCase()
      return Promise.resolve(
        rows
          .filter(
            (note) =>
              note.ownerId === userId && (!search || note.title.toLowerCase().includes(search)),
          )
          .toSorted((left, right) => right.createdAt.localeCompare(left.createdAt))
          .map(({ id, title, amount, createdAt }) => ({ id, title, amount, createdAt })),
      )
    },
    insert: (data) => {
      const note: StoredNote = {
        id: `note-${String(rows.length + 1)}`,
        title: data.title,
        amount: data.amount,
        createdAt: new Date(rows.length).toISOString(),
        ownerId: data.ownerId,
      }
      rows.push(note)
      const { id, title, amount, createdAt } = note
      return Promise.resolve({ id, title, amount, createdAt })
    },
  }
  return { repository, rows }
}
