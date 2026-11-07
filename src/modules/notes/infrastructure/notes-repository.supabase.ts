import 'server-only'
import { createClient } from '@/shared/infrastructure/supabase/server'
import type { NotesRepository } from '../application/notes-repository'
import { NoteSchema, type Note } from '../domain/note'

type NoteRow = { id: string; title: string; created_at: string }

/** Строка таблицы → модель домена; проверка схемой ловит расхождение базы и кода на границе. */
function toNote(row: NoteRow): Note {
  return NoteSchema.parse({ id: row.id, title: row.title, createdAt: row.created_at })
}

/**
 * Репозиторий на user-scoped клиенте Supabase: RLS ограничивает строки владельцем, фильтр по owner_id
 * дублирует это явно (защита в глубину и понятный план запроса).
 * Поиск: `%`, `_`, `\` экранируются, `*` убирается (PostgREST превращает его в `%`).
 */
export const supabaseNotesRepository: NotesRepository = {
  async listForUser(userId, filter) {
    const supabase = await createClient()
    let query = supabase
      .from('notes')
      .select('id, title, created_at')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false })
    const search = filter.q?.replace(/\*/g, '').replace(/[%_\\]/g, '\\$&')
    if (search) query = query.ilike('title', `%${search}%`)
    const { data, error } = await query
    if (error) throw new Error(`notes.list: ${error.message}`)
    return data.map(toNote)
  },

  async insert(data) {
    const supabase = await createClient()
    const { data: row, error } = await supabase
      .from('notes')
      .insert({ title: data.title, owner_id: data.ownerId })
      .select('id, title, created_at')
      .single()
    if (error) throw new Error(`notes.insert: ${error.message}`)
    return toNote(row)
  },
}
