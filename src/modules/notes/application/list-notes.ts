import type { Note } from '../domain/note'
import type { NotesFilter, NotesRepository } from './notes-repository'

export function makeListNotes({ notes }: { notes: NotesRepository }) {
  return (filter: NotesFilter, ctx: { userId: string }): Promise<Note[]> =>
    notes.listForUser(ctx.userId, filter)
}
