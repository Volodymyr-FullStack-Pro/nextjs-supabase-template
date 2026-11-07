import { z } from 'zod'

const NOTE_TITLE_MAX = 200

/** Модель заметки, как её видит приложение. Не строка таблицы: инфраструктура переводит строки в модель. */
export const NoteSchema = z.object({ id: z.string(), title: z.string(), createdAt: z.string() })
export type Note = z.infer<typeof NoteSchema>

/** Одна схема входа на форму и action. */
export const CreateNoteInput = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Введите заголовок')
    .max(NOTE_TITLE_MAX, `Не длиннее ${String(NOTE_TITLE_MAX)} символов`),
})
export type CreateNoteInput = z.infer<typeof CreateNoteInput>

/** Правило домена: заголовок хранится без лишних пробелов. Чистая функция, тестируется без базы. */
export function normalizeTitle(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ')
}
