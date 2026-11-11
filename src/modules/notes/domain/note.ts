import { z } from 'zod'

import { isIsoCurrency } from '@/shared/domain/currency'
import { decimalPattern, parseDecimalInput, SCALE } from '@/shared/domain/decimal-input'
import { normalizeText } from '@/shared/domain/text'

export const NOTE_TITLE_MAX = 200
export const NOTES_LIST_LIMIT = 100
export const NOTE_SEARCH_MAX = 100
export const NOTE_CURRENCY_LENGTH = 3

export const NOTE_MESSAGE_KEYS = {
  titleRequired: 'note.title.required',
  titleTooLong: 'note.title.tooLong',
  titleMeaningless: 'note.title.meaningless',
  amountInvalid: 'note.amount.invalid',
  amountTooPrecise: 'note.amount.tooPrecise',
  currencyInvalid: 'note.currency.invalid',
  requestReused: 'note.request.reused',
} as const
export type NoteMessageKey = (typeof NOTE_MESSAGE_KEYS)[keyof typeof NOTE_MESSAGE_KEYS]

export const NoteSchema = z.object({
  id: z.string(),
  title: z.string(),
  amount: z.string().regex(decimalPattern(SCALE.fiat)),
  currency: z.string(),
  createdAt: z.string(),
})
export type Note = z.infer<typeof NoteSchema>

export const CreateNoteInput = z.object({
  title: z
    .string()
    .transform(normalizeText)
    .pipe(
      z
        .string()
        .min(1, NOTE_MESSAGE_KEYS.titleRequired)
        .max(NOTE_TITLE_MAX, NOTE_MESSAGE_KEYS.titleTooLong),
    ),
  amount: z.string().transform((raw, ctx) => {
    const parsed = parseDecimalInput(raw, SCALE.fiat)
    if (parsed === null) {
      ctx.addIssue({ code: 'custom', message: NOTE_MESSAGE_KEYS.amountInvalid })
      return z.NEVER
    }
    return parsed
  }),
  currency: z
    .string()
    .transform((raw) => normalizeText(raw).toUpperCase())
    .pipe(z.string().refine(isIsoCurrency, NOTE_MESSAGE_KEYS.currencyInvalid)),
  clientRequestId: z.uuid(),
})
export type CreateNoteInput = z.infer<typeof CreateNoteInput>
