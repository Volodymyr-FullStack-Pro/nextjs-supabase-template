import 'server-only'

import { createClient } from '@/shared/infrastructure/supabase/server'

import type { NotesRepository } from '../application/notes-repository'
import { type Note, NOTE_SEARCH_MAX, NOTES_LIST_LIMIT, NoteSchema } from '../domain/note'

const NOTE_COLUMNS = 'id, title, amount::text, created_at'

type NoteRow = { id: string; title: string; amount: string; created_at: string }

function toNote(row: NoteRow): Note {
  return NoteSchema.parse({
    id: row.id,
    title: row.title,
    amount: row.amount,
    createdAt: row.created_at,
  })
}

export const supabaseNotesRepository: NotesRepository = {
  async listForUser(userId, filter) {
    const supabase = await createClient()
    let query = supabase
      .from('notes')
      .select(NOTE_COLUMNS)
      .eq('owner_id', userId)
      .order('created_at', { ascending: false })
      .limit(NOTES_LIST_LIMIT)
    const search = filter.q
      ?.slice(0, NOTE_SEARCH_MAX)
      .replace(/\*/g, '')
      .replace(/[%_\\]/g, '\\$&')
    if (search) query = query.ilike('title', `%${search}%`)
    const { data, error } = await query
    if (error) throw new Error(`notes.list: ${error.message}`)
    return data.map(toNote)
  },

  async insert(data) {
    const supabase = await createClient()
    const { data: row, error } = await supabase
      .from('notes')
      .insert({ title: data.title, owner_id: data.ownerId, amount: data.amount })
      .select(NOTE_COLUMNS)
      .single()
    if (error) throw new Error(`notes.insert: ${error.message}`)
    return toNote(row)
  },
}
