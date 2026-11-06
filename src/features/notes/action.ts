'use server'

import { revalidatePath } from 'next/cache'
import { createNote } from '@/data/notes'
import { ActionError, authActionClient } from '@/lib/safe-action'
import { AddNoteInput } from './schema'

/** Пример Server Action: сессия (middleware authActionClient) → Zod → DAL → revalidate. Ошибки уходят в result, не исключениями. */
export const addNote = authActionClient
  .inputSchema(AddNoteInput)
  .action(async ({ parsedInput, ctx }) => {
    try {
      await createNote(parsedInput, ctx.session.userId)
    } catch (cause) {
      throw new ActionError('Не удалось сохранить заметку', { cause }) // причина попадает в лог сервера
    }
    revalidatePath('/notes')
    return { ok: true as const }
  })
