import type { Note } from '../domain/note'

export type NotesFilter = { q?: string | undefined }

export type NewNote = {
  ownerId: string
  title: string
  amount: string
  currency: string
  clientRequestId: string
}

export interface NotesRepository {
  listForUser(userId: string, filter: NotesFilter): Promise<Note[]>
  insert(data: NewNote): Promise<Note>
}
