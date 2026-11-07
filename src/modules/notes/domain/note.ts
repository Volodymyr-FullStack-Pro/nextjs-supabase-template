import { z } from 'zod'

import { normalizeText } from '@/shared/domain/text'

export const NOTE_TITLE_MAX = 200

export const NoteSchema = z.object({ id: z.string(), title: z.string(), createdAt: z.string() })
export type Note = z.infer<typeof NoteSchema>

export const CreateNoteInput = z.object({
  title: z
    .string()
    .transform(normalizeText)
    .pipe(
      z
        .string()
        .min(1, 'Введите заголовок')
        .max(NOTE_TITLE_MAX, `Не длиннее ${String(NOTE_TITLE_MAX)} символов`),
    ),
})
export type CreateNoteInput = z.infer<typeof CreateNoteInput>
