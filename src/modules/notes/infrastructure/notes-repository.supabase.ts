import 'server-only'

import {
  databaseError,
  violatesUniqueConstraint,
} from '@/shared/infrastructure/supabase/postgres-errors'
import { createClient } from '@/shared/infrastructure/supabase/server'

import type { NotesRepository } from '../application/notes-repository'
import { type Note, NOTE_SEARCH_MAX, NOTES_LIST_LIMIT, NoteSchema } from '../domain/note'

const NOTE_COLUMNS = 'id, title, amount::text, currency, created_at'
const REQUEST_KEY_CONSTRAINT = 'notes_owner_id_client_request_id_key'

type NoteRow = { id: string; title: string; amount: string; currency: string; created_at: string }

function toNote(row: NoteRow): Note {
  return NoteSchema.parse({
    id: row.id,
    title: row.title,
    amount: row.amount,
    currency: row.currency,
    createdAt: row.created_at,
  })
}

async function findByRequest(ownerId: string, clientRequestId: string): Promise<Note> {
  const supabase = await createClient()
  const { data: row, error } = await supabase
    .from('notes')
    .select(NOTE_COLUMNS)
    .eq('owner_id', ownerId)
    .eq('client_request_id', clientRequestId)
    .single()
  if (error) throw databaseError('notes.findByRequest', error)
  return toNote(row)
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
    if (error) throw databaseError('notes.list', error)
    return data.map(toNote)
  },

  async insert(data) {
    const supabase = await createClient()
    const { data: row, error } = await supabase
      .from('notes')
      .insert({
        owner_id: data.ownerId,
        title: data.title,
        amount: data.amount,
        currency: data.currency,
        client_request_id: data.clientRequestId,
      })
      .select(NOTE_COLUMNS)
      .single()
    if (violatesUniqueConstraint(error, REQUEST_KEY_CONSTRAINT)) {
      const note = await findByRequest(data.ownerId, data.clientRequestId)
      return { note, repeatedRequest: true }
    }
    if (error) throw databaseError('notes.insert', error)
    return { note: toNote(row), repeatedRequest: false }
  },
}
