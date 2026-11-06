import { z } from 'zod'

/** Одна схема на клиент и сервер: форма валидирует до отправки, action — ещё раз на входе. */
export const AddNoteInput = z.object({
  title: z.string().trim().min(1, 'Введите заголовок').max(200, 'Не длиннее 200 символов'),
})
export type AddNoteInput = z.infer<typeof AddNoteInput>
