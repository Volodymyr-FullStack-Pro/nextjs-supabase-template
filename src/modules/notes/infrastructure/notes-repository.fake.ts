import type { NotesRepository } from '../application/notes-repository'
import type { Note } from '../domain/note'

type StoredNote = Note & { ownerId: string }

/** In-memory репозиторий для тестов use cases: та же семантика, что у Supabase-реализации (владелец, поиск без `*`, новые сверху), без базы. */
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
          .map(({ id, title, createdAt }) => ({ id, title, createdAt })),
      )
    },
    insert: (data) => {
      const note: StoredNote = {
        id: `note-${String(rows.length + 1)}`,
        title: data.title,
        createdAt: new Date(rows.length).toISOString(),
        ownerId: data.ownerId,
      }
      rows.push(note)
      return Promise.resolve({ id: note.id, title: note.title, createdAt: note.createdAt })
    },
  }
  return { repository, rows }
}
