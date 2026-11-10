import type { Note } from '../domain/note'

export type NotesFilter = { q?: string | undefined }

export interface NotesRepository {
  listForUser(userId: string, filter: NotesFilter): Promise<Note[]>
  insert(data: { ownerId: string; title: string; amount: string }): Promise<Note>
}
