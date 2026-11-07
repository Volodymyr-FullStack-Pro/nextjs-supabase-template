import type { NotesRepository } from '../application/notes-repository'
import type { Note } from '../domain/note'

type StoredNote = Note & { ownerId: string }

/** In-memory репозиторий для тестов use cases: та же семантика, что у Supabase-реализации, без базы. */
export function fakeNotesRepository(seed: StoredNote[] = []) {
  const rows: StoredNote[] = [...seed]
  const repository: NotesRepository = {
    listForUser: (userId, filter) => {
      const query = filter.q?.toLowerCase()
      return Promise.resolve(
        rows
          .filter(
            (note) =>
              note.ownerId === userId && (!query || note.title.toLowerCase().includes(query)),
          )
          .map(({ id, title, createdAt }) => ({ id, title, createdAt })),
      )
    },
    insert: (data) => {
      const note: StoredNote = {
        id: `note-${String(rows.length + 1)}`,
        title: data.title,
        createdAt: new Date(0).toISOString(),
        ownerId: data.ownerId,
      }
      rows.push(note)
      return Promise.resolve({ id: note.id, title: note.title, createdAt: note.createdAt })
    },
  }
  return { repository, rows }
}
