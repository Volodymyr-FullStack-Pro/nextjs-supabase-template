import type { NewNote, NotesRepository } from '../application/notes-repository'
import type { Note } from '../domain/note'

type StoredNote = NewNote & { id: string; createdAt: string }

const toNote = ({ id, title, amount, currency, createdAt }: StoredNote): Note => ({
  id,
  title,
  amount,
  currency,
  createdAt,
})

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
          .map(toNote),
      )
    },
    insert: (data) => {
      const existing = rows.find(
        (row) => row.ownerId === data.ownerId && row.clientRequestId === data.clientRequestId,
      )
      if (existing) return Promise.resolve(toNote(existing))
      const stored: StoredNote = {
        ...data,
        id: `note-${String(rows.length + 1)}`,
        createdAt: new Date(rows.length).toISOString(),
      }
      rows.push(stored)
      return Promise.resolve(toNote(stored))
    },
  }
  return { repository, rows }
}
