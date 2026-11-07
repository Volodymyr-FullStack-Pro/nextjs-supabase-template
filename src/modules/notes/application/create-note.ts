import { RuleViolationError } from '@/shared/domain/errors'
import { err, ok, type Result } from '@/shared/domain/result'
import { hasLettersOrDigits } from '@/shared/domain/text'

import type { CreateNoteInput, Note } from '../domain/note'
import type { NotesRepository } from './notes-repository'

export type CreateNoteError = RuleViolationError

export function makeCreateNote({ notes }: { notes: NotesRepository }) {
  return async (
    input: CreateNoteInput,
    ctx: { userId: string },
  ): Promise<Result<Note, CreateNoteError>> => {
    if (!hasLettersOrDigits(input.title)) {
      return err(
        new RuleViolationError(
          'note.title.meaningless',
          'Заголовок должен содержать буквы или цифры',
        ),
      )
    }
    return ok(await notes.insert({ ownerId: ctx.userId, title: input.title }))
  }
}
