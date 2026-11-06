import 'server-only'
import { createClient } from '@/lib/supabase/server'

/** Наружу уходит DTO с нужными полями, а не строка таблицы. */
export type NoteDto = { id: string; title: string; createdAt: string }

export async function listNotes(): Promise<NoteDto[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('notes')
    .select('id, title, created_at')
    .order('created_at', { ascending: false })
  if (error) throw new Error(`notes.list: ${error.message}`)
  return data.map((row) => ({ id: row.id, title: row.title, createdAt: row.created_at }))
}

/** owner_id берётся из проверенной сессии, а не из формы; RLS дополнительно проверяет совпадение с auth.uid(). */
export async function createNote(input: { title: string }, userId: string): Promise<NoteDto> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('notes')
    .insert({ title: input.title, owner_id: userId })
    .select('id, title, created_at')
    .single()
  if (error) throw new Error(`notes.create: ${error.message}`)
  return { id: data.id, title: data.title, createdAt: data.created_at }
}
