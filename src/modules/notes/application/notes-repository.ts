import type { Note } from '../domain/note'

export type NotesFilter = { q?: string | undefined }

/** Порт хранилища: описан в application, реализован в infrastructure (Supabase) и в тестовом фейке. */
export interface NotesRepository {
  listForUser(userId: string, filter: NotesFilter): Promise<Note[]>
  insert(data: { ownerId: string; title: string }): Promise<Note>
}
