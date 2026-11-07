import { RuleViolationError } from '@/shared/domain/errors'
import { err, ok, type Result } from '@/shared/domain/result'
import { normalizeTitle, type CreateNoteInput, type Note } from '../domain/note'
import type { NotesRepository } from './notes-repository'

export type CreateNoteError = RuleViolationError

/** Use case: правило домена → запись через порт. Владелец берётся из контекста, не из формы. */
export function makeCreateNote({ notes }: { notes: NotesRepository }) {
  return async (
    input: CreateNoteInput,
    ctx: { userId: string },
  ): Promise<Result<Note, CreateNoteError>> => {
    const title = normalizeTitle(input.title)
    if (title === '') {
      return err(new RuleViolationError('note.title.empty', 'Заголовок не может быть пустым'))
    }
    return ok(await notes.insert({ ownerId: ctx.userId, title }))
  }
}
