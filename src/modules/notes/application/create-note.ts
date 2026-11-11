import { RuleViolationError } from '@/shared/domain/errors'
import { exceedsCurrencyPrecision, money } from '@/shared/domain/money'
import { err, ok, type Result } from '@/shared/domain/result'
import { hasLettersOrDigits } from '@/shared/domain/text'

import { type CreateNoteInput, type Note, NOTE_MESSAGE_KEYS } from '../domain/note'
import type { NotesRepository } from './notes-repository'

export type CreateNoteError = RuleViolationError

const savedAsSubmitted = (saved: Note, input: CreateNoteInput) =>
  saved.title === input.title &&
  saved.currency === input.currency &&
  money(saved.amount).eq(input.amount)

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
    const { note, repeatedRequest } = await notes.insert({ ...input, ownerId: ctx.userId })
    if (repeatedRequest && !savedAsSubmitted(note, input)) {
      return err(new RuleViolationError(NOTE_MESSAGE_KEYS.requestReused))
    }
    return ok(note)
  }
}
