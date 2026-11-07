import { normalizeSearch } from '@/shared/domain/text'

import type { Note } from '../domain/note'
import type { NotesFilter, NotesRepository } from './notes-repository'

export function makeListNotes({ notes }: { notes: NotesRepository }) {
  return (filter: NotesFilter, ctx: { userId: string }): Promise<Note[]> => {
    const search = normalizeSearch(filter.q ?? '')
    return notes.listForUser(ctx.userId, search === '' ? {} : { q: search })
  }
}
