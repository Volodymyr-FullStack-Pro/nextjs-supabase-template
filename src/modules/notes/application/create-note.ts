import { RuleViolationError } from '@/shared/domain/errors'
import { exceedsCurrencyPrecision } from '@/shared/domain/money'
import { err, ok, type Result } from '@/shared/domain/result'
import { hasLettersOrDigits } from '@/shared/domain/text'

import { type CreateNoteInput, type Note, NOTE_MESSAGE_KEYS } from '../domain/note'
import type { NotesRepository } from './notes-repository'

export type CreateNoteError = RuleViolationError

export function makeCreateNote({ notes }: { notes: NotesRepository }) {
  return async (
    input: CreateNoteInput,
    ctx: { userId: string },
  ): Promise<Result<Note, CreateNoteError>> => {
    if (!hasLettersOrDigits(input.title)) {
      return err(new RuleViolationError(NOTE_MESSAGE_KEYS.titleMeaningless))
    }
    if (exceedsCurrencyPrecision(input.amount, input.currency)) {
      return err(new RuleViolationError(NOTE_MESSAGE_KEYS.amountTooPrecise))
    }
    return ok(await notes.insert({ ...input, ownerId: ctx.userId }))
  }
}
