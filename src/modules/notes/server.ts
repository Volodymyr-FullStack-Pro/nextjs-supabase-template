import 'server-only'
import { makeCreateNote } from './application/create-note'
import { makeListNotes } from './application/list-notes'
import { supabaseNotesRepository } from './infrastructure/notes-repository.supabase'

export const notes = {
  create: makeCreateNote({ notes: supabaseNotesRepository }),
  list: makeListNotes({ notes: supabaseNotesRepository }),
}
